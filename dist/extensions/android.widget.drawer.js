/* android.widget 2.2.0
   https://github.com/anpham6/androme */

this.android = this.android || {};
this.android.widget = this.android.widget || {};
this.android.widget.drawer = (function () {
    'use strict';

    var WIDGET_NAME = {
        __FRAMEWORK: 2,
        FAB: 'android.widget.floatingactionbutton',
        MENU: 'android.widget.menu',
        COORDINATOR: 'android.widget.coordinator',
        TOOLBAR: 'android.widget.toolbar',
        DRAWER: 'android.widget.drawer',
        BOTTOM_NAVIGATION: 'android.widget.bottomnavigation'
    };

    const template = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<resources>',
        '	<style name="{&appTheme}" parent="{~parentTheme}">',
        '		<item name="android:windowDrawsSystemBarBackgrounds">true</item>',
        '		<item name="android:statusBarColor">@android:color/transparent</item>',
        '		<item name="android:windowTranslucentStatus">true</item>',
        '!1',
        '		<item name="{&name}">{&value}</item>',
        '!1',
        '	</style>',
        '</resources>'
    ];
    var EXTENSION_DRAWER_TMPL = template.join('\n');

    var $enum = androme.lib.enumeration;
    var $const = androme.lib.constant;
    var $const_android = android.lib.constant;
    var $util = androme.lib.util;
    var $util_android = android.lib.util;
    var $dom = androme.lib.dom;
    var $resource_android = android.lib.base.Resource;
    class Drawer extends androme.lib.base.Extension {
        constructor(name, framework, tagNames, options) {
            super(name, framework, tagNames, options);
            this.documentRoot = true;
            this.require($const.EXT_NAME.EXTERNAL, true);
            this.require(WIDGET_NAME.MENU);
            this.require(WIDGET_NAME.COORDINATOR);
        }
        init(element) {
            if (this.included(element) && element.children.length > 0) {
                Array.from(element.children).forEach((item) => {
                    if (item.tagName === 'NAV' && !$util.includes(item.dataset.ext, $const.EXT_NAME.EXTERNAL)) {
                        item.dataset.ext = ($util.hasValue(item.dataset.ext) ? `${item.dataset.ext}, ` : '') + $const.EXT_NAME.EXTERNAL;
                    }
                });
                this.application.viewElements.add(element);
                return true;
            }
            return false;
        }
        processNode() {
            const node = this.node;
            const options = $util_android.createViewAttribute(this.options.self);
            if ($dom.getNestedExtension(node.element, WIDGET_NAME.MENU)) {
                $util.overwriteDefault(options, 'android', 'fitsSystemWindows', 'true');
                this.setResourceTheme();
            }
            else {
                const optionsNavigationView = $util_android.createViewAttribute(this.options.navigationView);
                $util.overwriteDefault(optionsNavigationView, 'android', 'layout_gravity', node.localizeString('left'));
                const navView = node.item();
                navView.android('layout_gravity', optionsNavigationView.android.layout_gravity);
                navView.android('layout_height', 'match_parent');
                navView.auto = false;
            }
            const output = this.application.viewController.renderNodeStatic($const_android.VIEW_SUPPORT.DRAWER, node.depth, $resource_android.formatOptions(options, this.application.settings), 'match_parent', 'match_parent', node, true);
            node.documentRoot = true;
            node.rendered = true;
            node.nodeType = $enum.NODE_STANDARD.BLOCK;
            node.excludeResource |= $enum.NODE_RESOURCE.FONT_STYLE;
            return { output, complete: true };
        }
        beforeInsert() {
            const application = this.application;
            const node = this.node;
            if (application.renderQueue[node.nodeId]) {
                const target = application.cacheSession.find(item => item.parent === node.parent && item.controlName === $const_android.VIEW_SUPPORT.COORDINATOR);
                if (target) {
                    application.renderQueue[target.nodeId] = application.renderQueue[node.nodeId];
                    delete application.renderQueue[node.nodeId];
                }
            }
            const options = $util_android.createViewAttribute(this.options.navigation);
            const menu = $util.optional($dom.getNestedExtension(node.element, WIDGET_NAME.MENU), 'dataset.layoutName');
            const headerLayout = $util.optional($dom.getNestedExtension(node.element, $const.EXT_NAME.EXTERNAL), 'dataset.layoutName');
            if (menu !== '') {
                $util.overwriteDefault(options, 'app', 'menu', `@menu/${menu}`);
            }
            if (headerLayout !== '') {
                $util.overwriteDefault(options, 'app', 'headerLayout', `@layout/${headerLayout}`);
            }
            if (menu !== '' || headerLayout !== '') {
                $util.overwriteDefault(options, 'android', 'id', `${node.stringId}_navigation`);
                $util.overwriteDefault(options, 'android', 'fitsSystemWindows', 'true');
                $util.overwriteDefault(options, 'android', 'layout_gravity', node.localizeString('left'));
                const output = application.viewController.renderNodeStatic($const_android.VIEW_SUPPORT.NAVIGATION_VIEW, node.depth + 1, $resource_android.formatOptions(options, this.application.settings), 'wrap_content', 'match_parent');
                application.addRenderQueue(node.id.toString(), [output]);
            }
        }
        afterInsert() {
            const node = this.node;
            const element = $dom.getNestedExtension(node.element, $const.EXT_NAME.EXTERNAL);
            if (element) {
                const header = $dom.getNodeFromElement(element);
                if (header && !header.hasHeight) {
                    header.android('layout_height', 'wrap_content');
                }
            }
        }
        setResourceTheme() {
            const options = Object.assign({}, this.options.resource);
            $util.overwriteDefault(options, '', 'appTheme', 'AppTheme');
            $util.overwriteDefault(options, '', 'parentTheme', 'Theme.AppCompat.Light.NoActionBar');
            const data = {
                'appTheme': options.appTheme,
                'parentTheme': options.parentTheme,
                '1': []
            };
            $util.overwriteDefault(options, 'output', 'path', 'res/values-v21');
            $util.overwriteDefault(options, 'output', 'file', `${WIDGET_NAME.DRAWER}.xml`);
            this.application.resourceHandler.addStyleTheme(EXTENSION_DRAWER_TMPL, data, options);
        }
    }

    const drawer = new Drawer(WIDGET_NAME.DRAWER, WIDGET_NAME.__FRAMEWORK);
    if (androme) {
        androme.registerExtensionAsync(drawer);
    }

    return drawer;

}());
