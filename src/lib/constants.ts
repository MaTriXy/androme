export enum NODE_STANDARD {
    NONE = 0,
    TEXT,
    EDIT,
    IMAGE,
    SELECT,
    RANGE,
    CHECKBOX,
    RADIO,
    BUTTON,
    LINE,
    SPACE,
    FRAME,
    LINEAR,
    CONSTRAINT,
    RELATIVE,
    GRID,
    SCROLL_VERTICAL,
    SCROLL_HORIZONTAL,
    SCROLL_NESTED,
    RADIO_GROUP
}

export enum NODE_RESOURCE {
    BOX_STYLE = 2,
    BOX_SPACING = 4,
    FONT_STYLE = 8,
    VALUE_STRING = 16,
    OPTION_ARRAY = 32,
    IMAGE_SOURCE = 64,
    ASSET = 8 | 16 | 32 | 64,
    ALL = 126
}

export enum NODE_PROCEDURE {
    LAYOUT = 2,
    ALIGNMENT = 4,
    CUSTOMIZATION = 16,
    ACCESSIBILITY = 32,
    ALL = 54
}

export enum BOX_STANDARD {
    MARGIN_TOP = 2,
    MARGIN_RIGHT = 4,
    MARGIN_BOTTOM = 8,
    MARGIN_LEFT = 16,
    PADDING_TOP = 32,
    PADDING_RIGHT = 64,
    PADDING_BOTTOM = 128,
    PADDING_LEFT = 256,
    MARGIN = 2 | 4 | 8 | 16,
    MARGIN_VERTICAL = 2 | 8,
    MARGIN_HORIZONTAL = 4 | 16,
    PADDING = 32 | 64 | 128 | 256,
    PADDING_VERTICAL = 32 | 128,
    PADDING_HORIZONTAL = 64 | 256
}

export const MAP_ELEMENT = {
    'INPUT': NODE_STANDARD.NONE,
    'PLAINTEXT': NODE_STANDARD.TEXT,
    'HR': NODE_STANDARD.LINE,
    'IMG': NODE_STANDARD.IMAGE,
    'SELECT': NODE_STANDARD.SELECT,
    'RANGE': NODE_STANDARD.RANGE,
    'TEXT': NODE_STANDARD.EDIT,
    'PASSWORD': NODE_STANDARD.EDIT,
    'NUMBER': NODE_STANDARD.EDIT,
    'EMAIL': NODE_STANDARD.EDIT,
    'SEARCH': NODE_STANDARD.EDIT,
    'URL': NODE_STANDARD.EDIT,
    'CHECKBOX': NODE_STANDARD.CHECKBOX,
    'RADIO': NODE_STANDARD.RADIO,
    'BUTTON': NODE_STANDARD.BUTTON,
    'SUBMIT': NODE_STANDARD.BUTTON,
    'RESET': NODE_STANDARD.BUTTON,
    'TEXTAREA': NODE_STANDARD.EDIT
};

export const BLOCK_ELEMENT = [
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'CANVAS',
    'DD',
    'DIV',
    'DL',
    'DT',
    'FIELDSET',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'LI',
    'MAIN',
    'NAV',
    'OL',
    'OUTPUT',
    'P',
    'PRE',
    'SECTION',
    'TABLE',
    'TFOOT',
    'UL',
    'VIDEO'
];

export const INLINE_ELEMENT = [
    'A',
    'ABBR',
    'ACRONYM',
    'B',
    'BDO',
    'BIG',
    'BR',
    'BUTTON',
    'CITE',
    'CODE',
    'DFN',
    'EM',
    'I',
    'IMG',
    'INPUT',
    'KBD',
    'LABEL',
    'MAP',
    'OBJECT',
    'Q',
    'S',
    'SAMP',
    'SCRIPT',
    'SELECT',
    'SMALL',
    'SPAN',
    'STRIKE',
    'STRONG',
    'SUB',
    'SUP',
    'TEXTAREA',
    'TIME',
    'TT',
    'U',
    'VAR'
];

export const enum OVERFLOW_ELEMENT {
    NONE = 0,
    HORIZONTAL = 2,
    VERTICAL = 4
}