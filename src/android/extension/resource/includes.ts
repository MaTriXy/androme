import View from '../../view';

import $util = androme.lib.util;
import $xml = androme.lib.xml;

type NodeRenderIndex = {
    item: View;
    name: string;
    index: number;
    merge: boolean;
};

export default class ResourceIncludes<T extends View> extends androme.lib.base.Extension<T> {
    public readonly eventOnly = true;

    public afterDepthLevel() {
        const processing = this.application.processing;
        for (const node of processing.cache) {
            const open: NodeRenderIndex[] = [];
            const close: NodeRenderIndex[] = [];
            node.each((item: T, index) => {
                const openTag = $util.hasValue(item.dataset.include);
                const closeTag = item.dataset.includeEnd === 'true';
                if (openTag || closeTag) {
                    const merge = item.dataset.includeMerge === 'true';
                    const data: NodeRenderIndex = {
                        item,
                        name: (item.dataset.include || '').trim(),
                        index,
                        merge
                    };
                    if (openTag) {
                        open.push(data);
                    }
                    if (closeTag) {
                        close.push(data);
                    }
                }
            }, true);
            if (open.length && close.length) {
                open.length = Math.min(open.length, close.length);
                for (let i = open.length; i < close.length; i++) {
                    close.shift();
                }
                for (let i = open.length - 1; i >= 0; i--) {
                    const openData = open[i];
                    for (let j = 0; j < close.length; j++) {
                        const closeData = close[j];
                        if (closeData.index >= openData.index) {
                            const location = new Map<string, T[]>();
                            let valid = true;
                            for (let k = openData.index; k <= closeData.index; k++) {
                                const item = node.renderChildren[k] as T;
                                const key = node.id.toString() + (item.renderPosition !== -1 ? `:${item.renderPosition}` : '');
                                const depthMap = processing.depthMap.get(key);
                                if (depthMap && depthMap.has(item.id)) {
                                    const items = location.get(key) || [];
                                    items.push(item);
                                    location.set(key, items);
                                }
                                else {
                                    valid = false;
                                }
                            }
                            if (valid) {
                                const content = new Map<number, string>();
                                const group: T[] = [];
                                let k = 0;
                                for (const [key, templates] of processing.depthMap.entries()) {
                                    const parent = location.get(key);
                                    if (parent) {
                                        const deleteIds: number[] = [];
                                        for (const [id, template] of templates.entries()) {
                                            const item = parent.find(sibling => sibling.id === id);
                                            if (item) {
                                                if (k === 0) {
                                                    const xml = this.application.viewController.renderNodeStatic('include', item.renderDepth, { layout: `@layout/${openData.name}` });
                                                    templates.set(id, xml);
                                                    k++;
                                                }
                                                else {
                                                    deleteIds.push(id);
                                                }
                                                content.set(id, template);
                                                group.push(item);
                                            }
                                        }
                                        deleteIds.forEach(value => templates.delete(value));
                                    }
                                }
                                if (content.size > 0) {
                                    const merge = openData.merge || content.size > 1;
                                    const depth = merge ? 1 : 0;
                                    for (const item of group) {
                                        if (item.renderDepth !== depth) {
                                            let output = content.get(item.id);
                                            if (output) {
                                                output = $xml.replaceIndent(output, depth);
                                                content.set(item.id, output);
                                                item.renderDepth = depth;
                                            }
                                        }
                                    }
                                    let xml = Array.from(content.values()).join('');
                                    if (merge) {
                                        xml = $xml.getEnclosingTag('merge', 0, 0, xml);
                                    }
                                    else if (!openData.item.documentRoot) {
                                        const placeholder = $xml.formatPlaceholder(openData.item.id, '@');
                                        xml = xml.replace(placeholder, `{#0}${placeholder}`);
                                    }
                                    this.application.addIncludeFile(openData.name, xml);
                                }
                            }
                            close.splice(j, 1);
                            break;
                        }
                    }
                }
            }
        }
    }
}