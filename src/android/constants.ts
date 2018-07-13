export enum BUILD_ANDROID {
    P = 28,
    OREO_1 = 27,
    OREO = 26,
    NOUGAT_1 = 25,
    NOUGAT = 24,
    MARSHMALLOW = 23,
    LOLLIPOP_1 = 22,
    LOLLIPOP = 21,
    KITKAT_1 = 20,
    KITKAT = 19,
    JELLYBEAN_2 = 18,
    JELLYBEAN_1 = 17,
    JELLYBEAN = 16,
    ICE_CREAM_SANDWICH_1 = 15,
    ICE_CREAM_SANDWICH = 14,
    ALL = 0,
    LATEST = 28
}

export enum DENSITY_ANDROID {
    LDPI = 120,
    MDPI = 160,
    HDPI = 240,
    XHDPI = 320,
    XXHDPI = 480,
    XXXHDPI = 640
}

export const NODE_ANDROID = {
    FRAME: 'FrameLayout',
    LINEAR: 'LinearLayout',
    CONSTRAINT: 'android.support.constraint.ConstraintLayout',
    RELATIVE: 'RelativeLayout',
    GRID: 'GridLayout',
    SCROLL_VERTICAL: 'ScrollView',
    SCROLL_HORIZONTAL: 'HorizontalScrollView',
    SCROLL_NESTED: 'android.support.v4.widget.NestedScrollView',
    RADIO_GROUP: 'RadioGroup',
    TEXT: 'TextView',
    EDIT: 'EditText',
    IMAGE: 'ImageView',
    SELECT: 'Spinner',
    RANGE: 'SeekBar',
    CHECKBOX: 'CheckBox',
    RADIO: 'RadioButton',
    BUTTON: 'Button',
    LINE: 'View',
    SPACE: 'Space',
    GUIDELINE: 'android.support.constraint.Guideline'
};

export const BOX_ANDROID = {
    MARGIN: 'layout_margin',
    MARGIN_VERTICAL: 'layout_marginVertical',
    MARGIN_HORIZONTAL: 'layout_marginHorizontal',
    MARGIN_TOP: 'layout_marginTop',
    MARGIN_RIGHT: 'layout_marginRight',
    MARGIN_BOTTOM: 'layout_marginBottom',
    MARGIN_LEFT: 'layout_marginLeft',
    PADDING: 'padding',
    PADDING_VERTICAL: 'paddingVertical',
    PADDING_HORIZONTAL: 'paddingHorizontal',
    PADDING_TOP: 'paddingTop',
    PADDING_RIGHT: 'paddingRight',
    PADDING_BOTTOM: 'paddingBottom',
    PADDING_LEFT: 'paddingLeft'
};

export const FIXED_ANDROID = [
    NODE_ANDROID.EDIT,
    NODE_ANDROID.SELECT,
    NODE_ANDROID.CHECKBOX,
    NODE_ANDROID.RADIO,
    NODE_ANDROID.BUTTON,
    NODE_ANDROID.IMAGE
];

export const XMLNS_ANDROID = {
    'android': 'http://schemas.android.com/apk/res/android',
    'app': 'http://schemas.android.com/apk/res-auto'
};

export const FONT_ANDROID = {
    'sans-serif': BUILD_ANDROID.ICE_CREAM_SANDWICH,
    'sans-serif-thin': BUILD_ANDROID.JELLYBEAN,
    'sans-serif-light': BUILD_ANDROID.JELLYBEAN,
    'sans-serif-condensed': BUILD_ANDROID.JELLYBEAN,
    'sans-serif-condensed-light': BUILD_ANDROID.JELLYBEAN,
    'sans-serif-medium': BUILD_ANDROID.LOLLIPOP,
    'sans-serif-black': BUILD_ANDROID.LOLLIPOP,
    'sans-serif-smallcaps': BUILD_ANDROID.LOLLIPOP,
    'serif-monospace' : BUILD_ANDROID.LOLLIPOP,
    'serif': BUILD_ANDROID.LOLLIPOP,
    'casual' : BUILD_ANDROID.LOLLIPOP,
    'cursive': BUILD_ANDROID.LOLLIPOP,
    'monospace': BUILD_ANDROID.LOLLIPOP,
    'sans-serif-condensed-medium': BUILD_ANDROID.OREO
};

export const FONTALIAS_ANDROID = {
    'arial': 'sans-serif',
    'helvetica': 'sans-serif',
    'tahoma': 'sans-serif',
    'verdana': 'sans-serif',
    'times': 'serif',
    'times new roman': 'serif',
    'palatino': 'serif',
    'georgia': 'serif',
    'baskerville': 'serif',
    'goudy': 'serif',
    'fantasy': 'serif',
    'itc stone serif': 'serif',
    'sans-serif-monospace': 'monospace',
    'monaco': 'monospace',
    'courier': 'serif-monospace',
    'courier new': 'serif-monospace'
};

export const FONTREPLACE_ANDROID = {
    'ms shell dlg \\32': 'sans-serif',
    'system-ui': 'sans-serif',
    '-apple-system': 'sans-serif'
};

export const FONTWEIGHT_ANDROID = {
    '100': 'thin',
    '200': 'extra_light',
    '300': 'light',
    '400': 'normal',
    '500': 'medium',
    '600': 'semi_bold',
    '700': 'bold',
    '800': 'extra_bold',
    '900': 'black'
};

export const WEBVIEW_ANDROID = [
    'STRONG',
    'B',
    'EM',
    'CITE',
    'DFN',
    'I',
    'BIG',
    'SMALL',
    'FONT',
    'BLOCKQUOTE',
    'TT',
    'A',
    'U',
    'SUP',
    'SUB',
    'STRIKE',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'DEL',
    'LABEL',
    'PLAINTEXT'
];