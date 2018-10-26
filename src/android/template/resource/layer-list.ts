const template = [
'!0',
'<?xml version="1.0" encoding="utf-8"?>',
'<layer-list xmlns:android="http://schemas.android.com/apk/res/android">',
'!1',
'	<item>',
'		<shape android:shape="rectangle">',
'			<solid android:color="@color/{&color}" />',
'		</shape>',
'	</item>',
'!1',
'!2',
'	<item>',
'       <shape android:shape="rectangle">',
'	        <gradient android:type="{&type}" android:startColor="@color/{&startColor}" android:centerColor="@color/{@centerColor}" android:endColor="@color/{&endColor}" android:angle="{@angle}" android:centerX="{@centerX}" android:centerY="{@centerY}" android:gradientRadius="{@gradientRadius}" android:useLevel="{@useLevel}" />',
'		</shape>',
'	</item>',
'!2',
'!3',
'	<item android:left="{@left}" android:top="{@top}" android:right="{@right}" android:bottom="{@bottom}" android:drawable="@drawable/{src}" width="{@width}" height="{@height}" />',
'!3',
'!4',
'	<item android:left="{@left}" android:top="{@top}" android:right="{@right}" android:bottom="{@bottom}">',
'		<bitmap android:src="@drawable/{src}" android:gravity="{@gravity}" android:tileMode="{@tileMode}" android:tileModeX="{@tileModeX}" android:tileModeY="{@tileModeY}" />',
'	</item>',
'!4',
'!8',
'	<item android:left="{@left}" android:top="{@top}" android:right="{@right}" android:bottom="{@bottom}">',
'		<shape android:shape="rectangle">',
        '!9',
'			<stroke android:width="{&width}" {borderStyle} />',
        '!9',
'		</shape>',
'	</item>',
'!8',
'!5',
'	<item android:left="{@left}" android:top="{@top}" android:right="{@right}" android:bottom="{@bottom}">',
'		<shape android:shape="rectangle">',
        '!6',
'			<stroke android:width="{&width}" {borderStyle} />',
        '!6',
        '!7',
'			<corners android:radius="{@radius}" android:topLeftRadius="{@topLeftRadius}" android:topRightRadius="{@topRightRadius}" android:bottomRightRadius="{@bottomRightRadius}" android:bottomLeftRadius="{@bottomLeftRadius}" />',
        '!7',
'		</shape>',
'	</item>',
'!5',
'</layer-list>',
'!0'
];

export default template.join('\n');