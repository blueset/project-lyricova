type TextWrapType = "wrap" | "nowrap" | "balance" | "stable" | "pretty" | "initial" | "inherit";

interface CSSStyleDeclaration {
    textWrap?: TextWrapType; 
    WebkitTextWrap?: TextWrapType; 
    MozTextWrap?: TextWrapType; 
    MsTextWrap?: TextWrapType;
}