## chrome-mobile-layouts

The program can convert moderately complex HTML pages into XML Constraint layouts for Android. iOS and Xamarin layouts are also to be supported at some point eventually to be hosted inside a Chrome browser plugin. Currently the XML structure can be imported into your Android projects although the attributes are nowhere close to being ready for production. Supports Grid layout with rowspan and colspan optimizations. Some modification is necessary to use the layout_xml.js in your webpage. Paste the Javascript code somewhere in a function after the DOM has been fully loaded. I have only tested it with the latest Chrome.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    var DEFAULT_ANDROID = {
        TEXT: 'TextView',
        LINEAR: 'LinearLayout',
        CONSTRAINT: 'ConstraintLayout',
        RELATIVE: 'RelativeLayout',
        GRID: 'GridLayout'
    };

    ...layout_xml.js

    console.log(output);
});
```

<img src="sample.png" alt="Chrome Mobile Layouts Plugin" />

## auto-generated xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout ID="1"
	android:id="id+/LinearLayout1">
	<TextView ID="2"
		android:id="id+/TextView1"
		android:text="@string/Entry"
		android:fontFamily="Arial, Helvetica, Tahoma"
		android:textSize="14px"
		android:textStyle="normal"
		android:textColor="#FFFFFF"
		android:letterSpacing="0.3" />
	<LinearLayout ID="3"
		android:id="id+/LinearLayout2">
		<GridLayout ID="4"
			android:id="id+/GridLayout1"
			android:columnCount="2">
			<TextView ID="6"
				android:id="id+/TextView2"
				android:text="@string/Order:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<EditText ID="7"
				android:id="@+id/order"
				android:fontFamily="Arial"
				android:textSize="13.3333px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
			<TextView ID="9"
				android:id="id+/TextView3"
				android:text="@string/Date (Add):"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="11"
				android:id="id+/ConstraintLayout1">
				<Spinner ID="12"
					android:id="@+id/month0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="13"
					android:id="@+id/day0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="14"
					android:id="@+id/year0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
			</ConstraintLayout>
			<TextView ID="16"
				android:id="id+/TextView4"
				android:text="@string/Time:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="17"
				android:id="id+/ConstraintLayout2">
				<Spinner ID="17"
					android:id="@+id/hour"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="18"
					android:id="@+id/minute"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
			</ConstraintLayout>
			<TextView ID="20"
				android:id="id+/TextView5"
				android:text="@string/Type:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="21"
				android:id="@+id/typeofentry"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
			<TextView ID="23"
				android:id="id+/TextView6"
				android:text="@string/Topic (Add):"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="25"
				android:id="id+/ConstraintLayout3">
				<EditText ID="26"
					android:id="@+id/topic0"
					android:fontFamily="Arial"
					android:textSize="13.3333px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="27"
					android:id="@+id/prominence0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
			</ConstraintLayout>
			<TextView ID="29"
				android:id="id+/TextView7"
				android:text="@string/Series:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="30"
				android:id="@+id/series"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
			<TextView ID="32"
				android:id="id+/TextView8"
				android:text="@string/Subset:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="33"
				android:id="@+id/subset"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
			<TextView ID="35"
				android:id="id+/TextView9"
				android:text="@string/Active:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="36"
				android:id="@+id/entryactive"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
		</GridLayout>
		<Button ID="37"
			android:id="id+/Button1"
			android:text="@string/Add" />
	</LinearLayout>
	<LinearLayout ID="38"
		android:id="id+/LinearLayout3">
		<GridLayout ID="39"
			android:id="id+/GridLayout2"
			android:columnCount="4">
			<TextView ID="41"
				android:id="id+/TextView10"
				android:text="@string/Series:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="42"
				android:id="@+id/series"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal"
				android:layout_columnSpan="3" />
			<TextView ID="44"
				android:id="id+/TextView11"
				android:text="@string/Subset:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="45"
				android:id="@+id/subset"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal"
				android:layout_columnSpan="3" />
			<TextView ID="47"
				android:id="id+/TextView12"
				android:text="@string/Entries:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="48"
				android:id="@+id/entry"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal" />
			<Button ID="49"
				android:id="id+/Button2"
				android:text="@string/Open" />
			<Button ID="50"
				android:id="id+/Button3"
				android:text="@string/All" />
			<TextView ID="52"
				android:id="id+/TextView13"
				android:text="@string/Mode:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="53"
				android:id="@+id/mode"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal"
				android:layout_columnSpan="3" />
			<TextView ID="55"
				android:id="id+/TextView14"
				android:text="@string/Style:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="56"
				android:id="@+id/style"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal"
				android:layout_columnSpan="3" />
			<TextView ID="58"
				android:id="id+/TextView15"
				android:text="@string/Calendar:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<Spinner ID="59"
				android:id="@+id/calendar"
				android:fontFamily="Arial"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="normal"
				android:layout_columnSpan="3" />
			<TextView ID="61"
				android:id="id+/TextView16"
				android:text="@string/Version:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="62"
				android:id="id+/ConstraintLayout4"
				android:layout_columnSpan="3">
				<Spinner ID="62"
					android:id="@+id/version"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="63"
					android:id="@+id/version_update"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Button ID="64"
					android:id="id+/Button4"
					android:text="@string/Update" />
			</ConstraintLayout>
			<TextView ID="66"
				android:id="id+/TextView17"
				android:text="@string/Branch:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="67"
				android:id="id+/ConstraintLayout5"
				android:layout_columnSpan="3">
				<Spinner ID="67"
					android:id="@+id/branch"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="68"
					android:id="@+id/branch_update"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Button ID="69"
					android:id="id+/Button5"
					android:text="@string/Update" />
				<Button ID="70"
					android:id="id+/Button6"
					android:text="@string/Clone" />
			</ConstraintLayout>
			<TextView ID="72"
				android:id="id+/TextView18"
				android:text="@string/Custom (Add):"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="74"
				android:id="id+/ConstraintLayout6"
				android:layout_columnSpan="3">
				<EditText ID="75"
					android:id="@+id/customname0"
					android:fontFamily="Arial"
					android:textSize="13.3333px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="76"
					android:id="@+id/custommonth0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<Spinner ID="77"
					android:id="@+id/customday0"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<EditText ID="78"
					android:id="@+id/customyear0"
					android:fontFamily="Arial"
					android:textSize="13.3333px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
			</ConstraintLayout>
			<TextView ID="80"
				android:id="id+/TextView19"
				android:text="@string/Conclusion:"
				android:fontFamily="Arial, Helvetica, Tahoma"
				android:textSize="12px"
				android:textStyle="normal"
				android:textColor="#000000"
				android:letterSpacing="0.3" />
			<ConstraintLayout ID="81"
				android:id="id+/ConstraintLayout8"
				android:layout_columnSpan="3">
				<Spinner ID="81"
					android:id="@+id/person"
					android:fontFamily="Arial"
					android:textSize="12px"
					android:textStyle="normal"
					android:textColor="#000000"
					android:letterSpacing="normal" />
				<ConstraintLayout ID="82"
					android:id="id+/ConstraintLayout7">
					<RadioGroup
						android:id="id+/RadioGroup1"
						android:checkedButton="@+id/c2">
						<RadioButton ID="83"
							android:id="@+id/c2"
							android:fontFamily="Arial"
							android:text="@string/Birth"
							android:textStyle="normal"
							android:textColor="#000000"
							android:letterSpacing="0.3" />
						<RadioButton ID="85"
							android:id="@+id/c3"
							android:fontFamily="Arial"
							android:text="@string/Death"
							android:textStyle="normal"
							android:textColor="#000000"
							android:letterSpacing="0.3" />
					</RadioGroup>
					<CheckBox ID="87"
						android:id="@+id/c4"
						android:fontFamily="Arial"
						android:text="@string/None"
						android:textStyle="normal"
						android:textColor="#000000"
						android:letterSpacing="0.3" />
				</ConstraintLayout>
				<Button ID="89"
					android:id="id+/Button7"
					android:text="@string/Update" />
			</ConstraintLayout>
		</GridLayout>
	</LinearLayout>
</LinearLayout>
```
## user written html

The DIV and FORM tag are not required for mobile devices which caused two additional Linear layouts to be auto-generated. Most of the android attributes were auto-generated from CSS and were not included with the sample HTML.

```xml
<html>
<head></head>
<body>
<div>
    <h2>Entry</h2>
    <form name="entry" autocomplete="off">
        <ul>
            <li>
                <label>Order:</label>
                <input type="text" name="order" class="null-allowed" />
            </li>
            <li>
                <label>Date (<a href="javascript://">Add</a>):</label>
                <div class="entry-date">
                    <select name="month0"></select>
                    <select name="day0"></select>
                    <select name="year0"></select>
                </div>
            </li>
            <li>
                <label>Time:</label>
                <select name="hour" class="null-allowed"></select>
                <select name="minute"></select>
            </li>
            <li>
                <label>Type:</label>
                <select name="typeofentry"></select>
            </li>
            <li>
                <label>Topic (<a href="javascript://">Add</a>):</label>
                <div class="entry-topic">
                    <input type="text" name="topic0" />
                    <select name="prominence0"></select>
                </div>
            </li>
            <li>
                <label>Series:</label>
                <select name="series"></select>
            </li>
            <li>
                <label>Subset:</label>
                <select name="subset"></select>
            </li>
            <li>
                <label>Active:</label>
                <select name="entryactive"></select>
            </li>
        </ul>
        <br />
        <input type="button" value="Add" />
    </form>
    <br />
    <br />
    <form name="itemofentry" action="/admin/itemofentry" method="post" autocomplete="off">
        <ul>
            <li>
                <label>Series:</label>
                <select name="series" class="req-pageurl-4"></select>
            </li>
            <li>
                <label>Subset:</label>
                <select name="subset" class="req-pageurl-5"></select>
            </li>
            <li>
                <label>Entries:</label>
                <select name="entry" class="req-pageurl-0"></select>
                <input type="button" value="Open" disabled="disabled" target="_blank" />
                <input type="button" value="All" disabled="disabled" target="_blank" />
            </li>
            <li>
                <label>Mode:</label>
                <select name="mode" class="req-pageurl-1"></select>
            </li>
            <li>
                <label>Style:</label>
                <select name="style" class="req-pageurl-2"></select>
            </li>
            <li>
                <label>Calendar:</label>
                <select name="calendar" class="req-pageurl-3"></select>
            </li>
            <li>
                <label>Version:</label>
                <select name="version" class="req-pageurl-6"></select>
                <select name="version_update" class="null-allowed"></select>
                <input type="button" value="Update" />
            </li>
            <li>
                <label>Branch:</label>
                <select name="branch" class="req-pageurl-7"></select>
                <select name="branch_update" class="null-allowed"></select>
                <input type="button" value="Update" />
                <input type="button" value="Clone" />
            </li>
            <li>
                <label>Custom (<a href="javascript://">Add</a>):</label>
                <div class="entry-custom">
                    <input type="text" name="customname0" class="null-allowed" />
                    <select name="custommonth0" class="null-allowed">
                        <option value=""></option>
                        <option value="1">01</option>
                        <option value="2">02</option>
                        <option value="3">03</option>
                        <option value="4">04</option>
                        <option value="5">05</option>
                        <option value="6">06</option>
                        <option value="7">07</option>
                        <option value="8">08</option>
                        <option value="9">09</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                    </select>
                    <select name="customday0" class="null-allowed"></select>
                    <input type="text" name="customyear0" class="null-allowed" />
                </div>
            </li>
            <li>
                <label>Conclusion:</label>
                <select name="person" class="null-allowed"></select>
                <div>
                    <input id="c2" type="radio" name="personbirth" value="1" checked="checked" />
                    <label for="c2">Birth</label>
                    <input id="c3" type="radio" name="personbirth" value="0" />
                    <label for="c3">Death</label>
                    <input id="c4" type="checkbox" name="conclusionnone" value="1" />
                    <label for="c4">None</label>
                </div>
                <input type="button" value="Update" />
            </li>
        </ul>
    </form>
</div>
</body>
</html>
```