import { ExtensionResult } from '../../../lib/types';
import Button from '../../../extension/button';
import Resource from '../../../base/resource';
import View from '../../view';
import { hasValue, includesEnum } from '../../../lib/util';
import { overwriteDefault, positionIsolated } from '../lib/util';
import { parseRGBA } from '../../../lib/color';
import { NODE_PROCEDURE, NODE_RESOURCE } from '../../../lib/constants';
import { DRAWABLE_PREFIX, VIEW_SUPPORT, WIDGET_NAME } from '../lib/constants';

export default class FloatingActionButton<T extends View> extends Button {
    constructor(name: string, tagNames?: string[], options?: {}) {
        super(name, tagNames, options);
    }

    public processNode(): ExtensionResult {
        const node = (<T> this.node);
        const parent = (<T> this.parent);
        const element = node.element;
        const options = Object.assign({}, this.options[element.id]);
        const backgroundColor = parseRGBA(node.css('backgroundColor'), node.css('opacity'));
        overwriteDefault(options, 'android', 'backgroundTint', (backgroundColor.length > 0 ? `@color/${Resource.addColor(backgroundColor[0], backgroundColor[2])}` : '?attr/colorAccent'));
        if (!includesEnum(node.excludeProcedure, NODE_PROCEDURE.ACCESSIBILITY)) {
            overwriteDefault(options, 'android', 'focusable', 'true');
        }
        let src = '';
        switch (element.tagName) {
            case 'IMG':
                src = Resource.addImageSrcSet(<HTMLImageElement> element, DRAWABLE_PREFIX.DIALOG);
                break;
            case 'INPUT':
                if ((<HTMLInputElement> element).type === 'image') {
                    src = Resource.addImage({ 'mdpi': (<HTMLInputElement> element).src }, DRAWABLE_PREFIX.DIALOG);
                }
                else {
                    src = Resource.addImageURL(node.css('backgroundImage'), DRAWABLE_PREFIX.DIALOG);
                }
                break;
            case 'BUTTON':
                src = Resource.addImageURL(node.css('backgroundImage'), DRAWABLE_PREFIX.DIALOG);
                break;
        }
        if (src !== '') {
            overwriteDefault(options, 'app', 'srcCompat', `@drawable/${src}`);
        }
        const target = hasValue(node.dataset.target);
        node.depth = (target ? node.depth : node.parent.renderDepth + 1);
        const xml = this.application.controllerHandler.renderNodeStatic(VIEW_SUPPORT.FLOATING_ACTION_BUTTON, (target ? -1 : node.depth), options, 'wrap_content', 'wrap_content', node);
        node.excludeResource |= NODE_RESOURCE.BOX_STYLE | NODE_RESOURCE.ASSET;
        if (node.isolated) {
            positionIsolated(node);
            if (target) {
                let anchor = parent.stringId;
                if (parent.nodeName === VIEW_SUPPORT.TOOLBAR) {
                    const outerParent = parent.data(`${WIDGET_NAME.TOOLBAR}:outerParent`);
                    if (outerParent != null) {
                        anchor = outerParent;
                    }
                }
                node.app('layout_anchor', anchor);
                node.app('layout_anchorGravity', <string> node.android('layout_gravity'));
                node.delete('android', 'layout_gravity');
                node.excludeProcedure |= NODE_PROCEDURE.ALIGNMENT;
                node.render(node);
            }
            else {
                node.render(parent);
            }
        }
        else {
            node.render(parent);
        }
        return { xml };
    }

    public afterInsert() {
        const node = (<T> this.node);
        node.android('layout_width', 'wrap_content');
        node.android('layout_height', 'wrap_content');
    }
}