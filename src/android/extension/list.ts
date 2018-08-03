import { ExtensionResult } from '../../extension/lib/types';
import List from '../../extension/list';
import View from '../view';
import { delimitDimen } from '../lib/util';
import { NODE_STANDARD } from '../../lib/constants';
import { EXT_NAME } from '../../extension/lib/constants';
import parseRTL from '../localization';

export default class ListAndroid<T extends View> extends List {
    constructor(name: string, tagNames?: string[], options?: {}) {
        super(name, tagNames, options);
    }

    public processChild(): ExtensionResult {
        const node = (<T> this.node);
        const controller = this.application.controllerHandler;
        const listStyle = node.data(`${EXT_NAME.LIST}:listStyle`);
        if (listStyle != null) {
            controller.prependBefore(
                node.id,
                controller.renderNodeStatic(
                    (listStyle !== '0' ? NODE_STANDARD.TEXT : NODE_STANDARD.SPACE),
                    node.depth + node.renderDepth, {
                        android: {
                            gravity: parseRTL('right'),
                            layout_columnWeight: '0',
                            [parseRTL('layout_marginRight')]: delimitDimen(node.tagName, parseRTL('margin_right'), '8px'),
                            text: (listStyle !== '0' ? listStyle : '')
                        }
                    },
                    'wrap_content',
                    'wrap_content'
                )
            );
            node.android('layout_columnWeight', '1');
            if (node.viewWidth === 0) {
                node.android('layout_width', 'wrap_content');
            }
        }
        return { xml: '' };
    }

    public afterInsert() {
        const node = (<T> this.node);
        if (node.is(NODE_STANDARD.GRID)) {
            node.android('layout_width', 'match_parent');
        }
    }
}