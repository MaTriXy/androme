import { SettingsAndroid } from '../../../types/local';
import WIDGET_NAME from '../namespace';

import EXTENSION_GENERIC_TMPL from '../__template/generic';

import View = android.lib.base.View;

import $enum = androme.lib.enumeration;
import $const_android = android.lib.constant;
import $util = androme.lib.util;
import $util_android = android.lib.util;
import $dom = androme.lib.dom;
import $resource_android = android.lib.base.Resource;

export default class BottomNavigation<T extends View> extends androme.lib.base.Extension<T> {
    constructor(
        name: string,
        framework: number,
        tagNames?: string[],
        options?: {})
    {
        super(name, framework, tagNames, options);
        this.require(WIDGET_NAME.MENU);
    }

    public processNode(): ExtensionResult {
        const node = this.node as T;
        const parent = this.parent as T;
        const options = $util_android.createViewAttribute(this.options[node.element.id]);
        $util.overwriteDefault(options, 'android', 'background', `?android:attr/windowBackground`);
        const output = this.application.viewController.renderNodeStatic(
            $const_android.VIEW_SUPPORT.BOTTOM_NAVIGATION,
            node.depth,
            $resource_android.formatOptions(options, <SettingsAndroid> this.application.settings),
            parent.is($enum.NODE_STANDARD.CONSTRAINT) ? '0px' : 'match_parent',
            'wrap_content',
            node
        );
        for (let i = 5; i < node.length; i++) {
            const item = node.item(i) as T;
            item.hide();
            item.cascade().forEach(child => child.hide());
        }
        node.cascade().forEach(item => this.subscribersChild.add(item as T));
        node.render(parent);
        node.nodeType = $enum.NODE_STANDARD.BLOCK;
        node.excludeResource |= $enum.NODE_RESOURCE.ASSET;
        this.setResourceTheme();
        return { output, complete: true };
    }

    public beforeInsert() {
        const node = this.node as T;
        const menu: string = $util.optional($dom.getNestedExtension(node.element, WIDGET_NAME.MENU), 'dataset.layoutName');
        if (menu !== '') {
            const options = $util_android.createViewAttribute(this.options[node.element.id]);
            $util.overwriteDefault(options, 'app', 'menu', `@menu/${menu}`);
            node.app('menu', options.app.menu);
        }
    }

    public afterInsert() {
        const node = this.node as T;
        const renderParent = node.renderParent as T;
        if (!renderParent.has('width')) {
            renderParent.android('layout_width', 'match_parent');
        }
        if (!renderParent.has('height')) {
            renderParent.android('layout_height', 'match_parent');
        }
    }

    private setResourceTheme() {
        const options: ExternalData = Object.assign({}, this.options.resource);
        $util.overwriteDefault(options, '', 'appTheme', 'AppTheme');
        $util.overwriteDefault(options, '', 'parentTheme', 'Theme.AppCompat.Light.DarkActionBar');
        const data = {
            'appTheme': options.appTheme,
            'parentTheme': options.parentTheme,
            '1': []
        };
        $util.overwriteDefault(options, 'output', 'path', 'res/values');
        $util.overwriteDefault(options, 'output', 'file', `${WIDGET_NAME.BOTTOM_NAVIGATION}.xml`);
        (<android.lib.base.Resource<T>> this.application.resourceHandler).addStyleTheme(EXTENSION_GENERIC_TMPL, data, options);
    }
}