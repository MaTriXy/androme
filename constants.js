const WIDGET_ANDROID = {
    TEXT: 'TextView',
    EDIT: 'EditText',
    LINEAR: 'LinearLayout',
    CONSTRAINT: 'ConstraintLayout',
    RELATIVE: 'RelativeLayout',
    GRID: 'GridLayout',
    SCROLL_VERTICAL: 'ScrollView',
    SCROLL_HORIZONTAL: 'HorizontalScrollView',
    SCROLL_NESTED: 'NestedScrollView',
    RADIO: 'RadioButton',
    RADIO_GROUP: 'RadioGroup'
};

const WEBVIEW_ANDROID = ['STRONG', 'B', 'EM', 'CITE', 'DFN', 'I', 'BIG', 'SMALL', 'FONT', 'BLOCKQUOTE', 'TT', 'A', 'U', 'SUP', 'SUB', 'STRIKE'];

const MAPPING_ANDROID = {
    'TEXT': 'TextView',
    'LABEL': 'TextView',
    'P': 'TextView',
    'HR': 'View',
    'IMG': 'ImageView',
    'SELECT': 'Spinner',
    'INPUT' : {
        'text': 'EditText',
        'password': 'EditText',
        'checkbox': 'CheckBox',
        'radio': 'RadioButton',
        'button': 'Button',
        'submit': 'Button'
    },
    'BUTTON': 'Button',
    'TEXTAREA': 'EditText'
};

const INHERIT_ANDROID = {
    'TextView': {
        'fontFamily': 'android:fontFamily="{0}"',
        'fontSize': 'android:textSize="{0}"',
        'fontWeight': 'android:fontWeight="{0}"',
        'fontStyle': 'android:textStyle="{0}"',
        'color': 'android:textColor="{0}"'
    }
}

const PROPERTY_ANDROID = {
    'gravity': {
        'gravity': 'android:gravity="{0}"'
    },
    'backgroundStyle': {
        'backgroundColor': 'android:background="@drawable/{0}"'
    },
    'computedStyle': {
        'fontFamily': 'android:fontFamily="{0}"',
        'fontSize': 'android:textSize="{0}"',
        'fontWeight': 'android:fontWeight="{0}"',
        'fontStyle': 'android:textStyle="{0}"',
        'color': 'android:textColor="{0}"',
        'backgroundColor': 'android:background="{0}"'
    },
    'boxSpacing': {
        'margin': 'android:layout_margin="{0}"',
        'marginTop': 'android:layout_marginTop="{0}"',
        'marginRight': 'android:layout_marginRight="{0}"',
        'marginBottom': 'android:layout_marginBottom="{0}"',
        'marginLeft': 'android:layout_marginLeft="{0}"',
        'padding': 'android:padding="{0}"',
        'paddingTop': 'android:paddingTop="{0}"',
        'paddingRight': 'android:paddingRight="{0}"',
        'paddingBottom': 'android:paddingBottom="{0}"',
        'paddingLeft': 'android:paddingLeft="{0}"',
    },
    'resourceString': {
        'text': 'android:text="@string/{0}"'
    },
    'resourceStringArray': {
        'entries': 'android:entries="@array/{0}"'
    }
};

const ACTION_ANDROID = {
    'LinearLayout': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setGravity': PROPERTY_ANDROID['gravity'],
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'RelativeLayout': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'ConstraintLayout': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'GridLayout': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'ScrollView': {
        'androidId': 'android:id="@+id/{0}"'
    },
    'HorizonatalView': {
        'androidId': 'android:id="@+id/{0}"'
    },
    'NestedScrollView': {
        'androidId': 'android:id="@+id/{0}"'
    },
    'RadioGroup': {
        'androidId': 'android:id="@+id/{0}"',
        'androidCheckedButton': 'android:checkedButton="@id+/{0}"'
    },
    'RadioButton': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'CheckBox': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'Spinner': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing'],
        'window.addResourceStringArray': PROPERTY_ANDROID['resourceStringArray']
    },
    'TextView': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setGravity': PROPERTY_ANDROID['gravity'],
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing'],
        'window.addResourceString': PROPERTY_ANDROID['resourceString']
    },
    'EditText': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setGravity': PROPERTY_ANDROID['gravity'],
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing'],
        'window.addResourceString': PROPERTY_ANDROID['resourceString']
    },
    'View': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    },
    'Button': {
        'androidId': 'android:id="@+id/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setComputedStyle': PROPERTY_ANDROID['computedStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing'],
        'window.addResourceString': PROPERTY_ANDROID['resourceString']
    },
    'ImageView': {
        'androidId': 'android:id="@+id/{0}"',
        'androidSrc': 'android:src="@drawable/{0}"',
        'window.setBackgroundStyle': PROPERTY_ANDROID['backgroundStyle'],
        'window.setBoxSpacing': PROPERTY_ANDROID['boxSpacing']
    }
};

const STRING_ANDROID = {
    XML_DECLARATION: '<?xml version="1.0" encoding="utf-8"?>',
    XMLNS_ANDROID: 'xmlns:android="http://schemas.android.com/apk/res/android"',
    XMLNS_APP: 'xmlns:app="http://schemas.android.com/apk/res-auto"',
    SPACE: '<Space\nandroid:layout_columnSpan="{2}"\nandroid:layout_columnWeight="{3}"\nandroid:layout_height="{1}"\nandroid:layout_width="{0}" />'
};

const DENSITY_ANDROID = {
    LDPI: 120,
    MDPI: 160,
    HDPI: 240,
    XHDPI: 320,
    XXHDPI: 480,
    XXXHDPI: 640
};