package gospeak

import (
	"fmt"
	"go/types"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"

	"github.com/pkg/errors"
	"github.com/webrpc/webrpc/schema"
)

func (p *parser) parseType(typ types.Type) (*schema.VarType, error) {
	return p.parseNamedType("", typ)
}

func (p *parser) parseNamedType(typeName string, typ types.Type) (varType *schema.VarType, err error) {
	// Return a parsedType from cache, if exists.
	if parsedType, ok := p.parsedTypes[typ]; ok {
		return parsedType, nil
	}

	// Otherwise, create a new parsedType record and warm up the cache up-front.
	// Claim the cache key and fill in the value later in defer(). Meanwhile, any
	// following recursive call(s) to this function (ie. on recursive types like
	// self-referencing structs, linked lists, graphs, circular dependencies etc.)
	// will return early with the same pointer.
	//
	// Note: We're parsing sequentially, no need for sync.Map.
	cacheDoNotReturn := &schema.VarType{
		Expr: typeName,
	}
	p.parsedTypes[typ] = cacheDoNotReturn

	defer func() {
		if varType != nil {
			*cacheDoNotReturn = *varType // Update the cache value via pointer dereference.
			varType = cacheDoNotReturn
		}
	}()

	switch v := typ.(type) {
	case *types.Named:
		pkg := v.Obj().Pkg()
		underlying := v.Underlying()
		typeName := p.goTypeName(typ)

		// If the type implements encoding.TextMarshaler, it's a string.
		if isTextMarshaler(v, pkg) {
			return &schema.VarType{
				Expr: "string",
				Type: schema.T_String,
			}, nil
		}

		switch u := underlying.(type) {

		case *types.Pointer:
			// Named pointer. Webrpc can't handle that.
			// Example:
			//   type NamedPtr *Obj

			// Go for the underlying element type name (ie. `Obj`).
			return p.parseNamedType(p.goTypeName(underlying), u.Underlying())

		case *types.Slice, *types.Array:
			// Named slice/array. Webrpc can't handle that.
			// Example:
			//  type NamedSlice []int
			//  type NamedSlice []Obj

			// If the named type is a slice/array and implements json.Marshaler,
			// we assume it's []any.
			if isJsonMarshaller(v, pkg) {
				return &schema.VarType{
					Expr: "[]any",
					Type: schema.T_List,
					List: &schema.VarListType{
						Elem: &schema.VarType{
							Expr: "any",
							Type: schema.T_Any,
						},
					},
				}, nil
			}

			var elem types.Type // = u.Elem().Underlying()
			// NOTE: Calling the above u.Elem().Underlying() directly fails to build with
			//       "u.Elem undefined (type types.Type has no field or method Elem)" error
			//       even though both *types.Slice and *types.Array have the .Elem() method.
			switch underlyingElem := u.(type) {
			case *types.Slice:
				elem = underlyingElem.Elem().Underlying()
			case *types.Array:
				elem = underlyingElem.Elem().Underlying()
			}

			// If the named type is a slice/array and its underlying element
			// type is basic type (ie. `int`), we go for it directly.
			if basic, ok := elem.(*types.Basic); ok {
				basicType, err := p.parseBasic(basic)
				if err != nil {
					return nil, errors.Wrap(err, "failed to parse []namedBasicType")
				}
				return &schema.VarType{
					Expr: fmt.Sprintf("[]%v", basicType.String()),
					Type: schema.T_List,
					List: &schema.VarListType{
						Elem: basicType,
					},
				}, nil
			}

			// Otherwise, go for the underlying element type name (ie. `Obj`).
			return p.parseNamedType(p.goTypeName(underlying), u.Underlying())

		default:
			if isJsonMarshaller(v, pkg) {
				return &schema.VarType{
					Expr: "any",
					Type: schema.T_Any,
				}, nil
			}

			if pkg == nil {
				return p.parseNamedType(typeName, underlying)
			}

			if pkg.Path() == "time" && v.Obj().Id() == "Time" {
				return &schema.VarType{
					Expr: "timestamp",
					Type: schema.T_Timestamp,
				}, nil
			}

			return p.parseNamedType(typeName, underlying)
		}

	case *types.Basic:
		return p.parseBasic(v)

	case *types.Struct:
		return p.parseStruct(typeName, v)

	case *types.Slice:
		return p.parseSlice(typeName, v)

	case *types.Interface:
		return p.parseInterface(typeName, v)

	case *types.Map:
		return p.parseMap(typeName, v)

	case *types.Pointer:
		if typeName == "" {
			return p.parseNamedType(p.goTypeName(v), v.Elem())
		}
		return p.parseNamedType(typeName, v.Elem())

	default:
		return nil, errors.Errorf("unsupported argument type %T", typ)
	}
}

func findFirstLetter(s string) int {
	for i, char := range s {
		if unicode.IsLetter(char) {
			return i
		}
	}
	return 0
}

func (p *parser) goTypeName(typ types.Type) string {
	name := typ.String() // []*github.com/golang-cz/gospeak/pkg.Typ

	firstLetter := findFirstLetter(name)
	prefix := name[:firstLetter] // []*

	name = name[firstLetter:]                                  // github.com/golang-cz/gospeak/pkg.Typ
	name = filepath.Base(name)                                 // pkg.Typ
	name = strings.TrimPrefix(name, p.schemaPkgName+".")       // Typ (ignores root pkg)
	name = strings.TrimPrefix(name, "command-line-arguments.") // Typ (ignores "command-line-arguments" pkg autogenerated by Go tool chain)

	return prefix + name // []*Typ
}

func (p *parser) parseBasic(typ *types.Basic) (*schema.VarType, error) {
	var varType schema.VarType
	if err := schema.ParseVarTypeExpr(p.schema, typ.Name(), &varType); err != nil {
		return nil, errors.Wrapf(err, "failed to parse basic type: %v", typ.Name())
	}

	return &varType, nil
}

func (p *parser) parseStruct(typeName string, structTyp *types.Struct) (*schema.VarType, error) {
	msg := &schema.Type{
		Kind: "struct",
		Name: typeName,
	}

	for i := 0; i < structTyp.NumFields(); i++ {
		structField := structTyp.Field(i)
		if !structField.Exported() {
			continue
		}
		structTags := structTyp.Tag(i)

		if structField.Embedded() || strings.Contains(structTags, `json:",inline"`) {
			varType, err := p.parseNamedType("", structField.Type())
			if err != nil {
				return nil, fmt.Errorf("parsing var %v: %w", structField.Name(), err)
			}

			if varType.Type == schema.T_Struct {
				for _, embeddedField := range varType.Struct.Type.Fields {
					msg.Fields = appendOrOverrideExistingField(msg.Fields, embeddedField)
				}
			}
			continue
		}

		field, err := p.parseStructField(typeName, structField, structTags)
		if err != nil {
			return nil, fmt.Errorf("parsing struct field %v: %w", i, err)
		}
		if field != nil {
			msg.Fields = appendOrOverrideExistingField(msg.Fields, field)
		}
	}

	p.schema.Types = append(p.schema.Types, msg)

	return &schema.VarType{
		Expr: typeName,
		Type: schema.T_Struct,
		Struct: &schema.VarStructType{
			Name: typeName,
			Type: msg,
		},
	}, nil
}

// This regex will return the following three submatches,
// given `db:"id,omitempty,pk" json:"id,string"` struct tag:
//
//	[0]: json:"id,string"
//	[1]: id
//	[2]: ,string
var jsonTagRegex, _ = regexp.Compile(`\s?json:\"([^,\"]*)(,[^\"]*)?\"`)

// parses single Go struct field
// if the field is embedded, ie. `json:",inline"`, recursively parse
func (p *parser) parseStructField(structTypeName string, field *types.Var, structTags string) (*schema.TypeField, error) {
	optional := false

	fieldName := field.Name()
	jsonFieldName := fieldName
	goFieldName := fieldName

	fieldType := field.Type()
	goFieldType := p.goTypeName(fieldType)

	if strings.Contains(structTags, `json:"`) {
		submatches := jsonTagRegex.FindStringSubmatch(structTags)
		// Submatches from the jsonTagRegex:
		// [0]: json:"deleted_by,omitempty,string"
		// [1]: deleted_by
		// [2]: ,omitempty,string
		if len(submatches) != 3 {
			return nil, errors.Errorf("unexpected number of json struct tag submatches")
		}
		if submatches[1] == "-" { // struct field ignored by `json:"-"` struct tag
			return nil, nil
		}
		if submatches[1] != "" { // struct field name renamed by json struct tag
			jsonFieldName = submatches[1]
		}
		optional = strings.Contains(submatches[2], ",omitempty")
		if strings.Contains(submatches[2], ",string") { // field type should be string in JSON
			return &schema.TypeField{
				Name: jsonFieldName,
				Type: &schema.VarType{
					Expr: "string",
					Type: schema.T_String,
				},
				TypeExtra: schema.TypeExtra{
					Meta: []schema.TypeFieldMeta{
						{"go.field.name": goFieldName},
						{"go.field.type": goFieldType},
					},
					Optional: optional,
				},
			}, nil
		}
	}

	if _, ok := field.Type().Underlying().(*types.Pointer); ok {
		optional = true
	}

	if _, ok := field.Type().Underlying().(*types.Struct); ok {
		// Anonymous struct fields.
		// Example:
		//   type Something struct {
		// 	   AnonymousField struct { // no explicit struct type name
		//       Name string
		//     }
		//   }
		structTypeName = structTypeName + "Anonymous" + field.Name()
	}

	varType, err := p.parseNamedType(structTypeName, fieldType)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse var %v", field.Name())
	}
	varType.Expr = goFieldType

	structField := &schema.TypeField{
		Name: jsonFieldName,
		Type: varType,
		TypeExtra: schema.TypeExtra{
			Meta: []schema.TypeFieldMeta{
				{"go.field.name": goFieldName},
				{"go.field.type": goFieldType},
			},
			Optional: optional,
		},
	}

	return structField, nil
}

func (p *parser) parseSlice(typeName string, sliceTyp *types.Slice) (*schema.VarType, error) {
	elem, err := p.parseNamedType(typeName, sliceTyp.Elem())
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse slice type")
	}

	actualTypeName := typeName
	if actualTypeName == "" {
		actualTypeName = elem.String()
	}

	varType := &schema.VarType{
		Expr: fmt.Sprintf("[]%v", actualTypeName),
		Type: schema.T_List,
		List: &schema.VarListType{
			Elem: elem,
		},
	}

	return varType, nil
}

func (p *parser) parseInterface(typeName string, iface *types.Interface) (*schema.VarType, error) {
	varType := &schema.VarType{
		Expr: "any",
		Type: schema.T_Any,
	}

	return varType, nil
}

func (p *parser) parseMap(typeName string, m *types.Map) (*schema.VarType, error) {
	key, err := p.parseNamedType(typeName, m.Key())
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse map key type")
	}

	value, err := p.parseNamedType(typeName, m.Elem())
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse map value type")
	}

	varType := &schema.VarType{
		Expr: fmt.Sprintf("map<%v,%v>", key, value),
		Type: schema.T_Map,
		Map: &schema.VarMapType{
			Key:   key.Type,
			Value: value,
		},
	}

	return varType, nil
}

var textMarshalerRegex = regexp.MustCompile(`^func \((.+)\)\.MarshalText\(\) \((.+ )?\[\]byte, ([a-z]+ )?error\)$`)
var textUnmarshalerRegex = regexp.MustCompile(`^func \((.+)\)\.UnmarshalText\((.+ )?\[\]byte\) \(?(.+ )?error\)?$`)

// Returns true if the given type implements encoding.TextMarshaler/TextUnmarshaler interfaces.
func isTextMarshaler(typ types.Type, pkg *types.Package) bool {
	marshalTextMethod, _, _ := types.LookupFieldOrMethod(typ, true, pkg, "MarshalText")
	if marshalTextMethod == nil || !textMarshalerRegex.MatchString(marshalTextMethod.String()) {
		return false
	}

	unmarshalTextMethod, _, _ := types.LookupFieldOrMethod(typ, true, pkg, "UnmarshalText")
	if unmarshalTextMethod == nil || !textUnmarshalerRegex.MatchString(unmarshalTextMethod.String()) {
		return false
	}

	return true
}

var jsonMarshalerRegex = regexp.MustCompile(`^func \((.+)\)\.MarshalJSON\(\) \((.+ )?\[\]byte, ([a-z]+ )?error\)$`)
var jsonUnmarshalerRegex = regexp.MustCompile(`^func \((.+)\)\.UnmarshalJSON\((.+ )?\[\]byte\) \(?(.+ )?error\)?$`)

// Returns true if the given type implements json.Marshaler/Unmarshaler interfaces.
func isJsonMarshaller(typ types.Type, pkg *types.Package) bool {
	marshalJsonMethod, _, _ := types.LookupFieldOrMethod(typ, true, pkg, "MarshalJSON")
	if marshalJsonMethod == nil || !jsonMarshalerRegex.MatchString(marshalJsonMethod.String()) {
		return false
	}

	unmarshalJsonMethod, _, _ := types.LookupFieldOrMethod(typ, true, pkg, "UnmarshalJSON")
	if unmarshalJsonMethod == nil || !jsonUnmarshalerRegex.MatchString(unmarshalJsonMethod.String()) {
		return false
	}

	return true
}

// Appends message field to the given slice, while also removing any previously defined field of the same name.
// This lets us overwrite embedded fields, exactly how Go does it behind the scenes in the JSON marshaller.
func appendOrOverrideExistingField(slice []*schema.TypeField, newItem *schema.TypeField) []*schema.TypeField {
	// Let's try to find an existing item of the same name and delete it.
	for i, item := range slice {
		if item.Name == newItem.Name {
			// Delete item.
			copy(slice[i:], slice[i+1:])
			slice = slice[:len(slice)-1]
		}
	}
	// And then append the new item at the end of the slice.
	return append(slice, newItem)
}
