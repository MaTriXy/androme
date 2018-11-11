import { BOX_STANDARD, CSS_STANDARD, USER_AGENT } from '../lib/enumeration';
import { EXT_NAME } from '../lib/constant';

import Node from '../base/node';
import Extension from '../base/extension';

import { convertFloat, convertInt, formatPX, hasBit, isPercent, isUnit } from '../lib/util';
import { cssInherit, getStyle, isUserAgent } from '../lib/dom';

export default abstract class Table<T extends Node> extends Extension<T> {
    public processNode(node: T, parent: T): ExtensionResult<T> {
        function setAutoWidth(td: T) {
            td.data(EXT_NAME.TABLE, 'percent', `${Math.round((td.bounds.width / node.bounds.width) * 100)}%`);
            td.data(EXT_NAME.TABLE, 'expand', true);
        }
        function setBoundsWidth(td: T) {
            td.css('width', formatPX(td.bounds.width));
        }
        const table: T[] = [];
        const thead = node.filter(item => item.tagName === 'THEAD');
        const tbody = node.filter(item => item.tagName === 'TBODY');
        const tfoot = node.filter(item => item.tagName === 'TFOOT');
        const colgroup = Array.from(node.element.children).find(element => element.tagName === 'COLGROUP');
        const tableWidth = node.css('width');
        if (thead.length > 0) {
            thead[0].cascade()
                .filter(item => item.tagName === 'TH' || item.tagName === 'TD')
                .forEach(item => item.inherit(thead[0], 'styleMap'));
            table.push(...thead[0].list as T[]);
            thead.forEach(item => item.hide());
        }
        if (tbody.length > 0) {
            tbody.forEach(item => {
                table.push(...item.list as T[]);
                item.hide();
            });
        }
        if (tfoot.length > 0) {
            tfoot[0].cascade()
                .filter(item => item.tagName === 'TH' || item.tagName === 'TD')
                .forEach(item => item.inherit(tfoot[0], 'styleMap'));
            table.push(...tfoot[0].list as T[]);
            tfoot.forEach(item => item.hide());
        }
        const layoutFixed = node.css('tableLayout') === 'fixed';
        const borderCollapse = node.css('borderCollapse') === 'collapse';
        const [horizontal, vertical] = borderCollapse ? [0, 0] : node.css('borderSpacing').split(' ').map(value => parseInt(value));
        if (horizontal > 0) {
            node.modifyBox(BOX_STANDARD.PADDING_LEFT, horizontal);
            node.modifyBox(BOX_STANDARD.PADDING_RIGHT, horizontal);
        }
        else {
            node.modifyBox(BOX_STANDARD.PADDING_LEFT, null);
            node.modifyBox(BOX_STANDARD.PADDING_RIGHT, null);
        }
        if (vertical > 0) {
            node.modifyBox(BOX_STANDARD.PADDING_TOP, vertical);
            node.modifyBox(BOX_STANDARD.PADDING_BOTTOM, vertical);
        }
        else {
            node.modifyBox(BOX_STANDARD.PADDING_TOP, null);
            node.modifyBox(BOX_STANDARD.PADDING_BOTTOM, null);
        }
        const spacingWidth = formatPX(horizontal > 1 ? Math.round(horizontal / 2) : horizontal);
        const spacingHeight = formatPX(vertical > 1 ? Math.round(vertical / 2) : vertical);
        const mapWidth: string[] = [];
        const mapBounds: number[] = [];
        const rowWidth: number[] = [];
        let columnIndex = new Array(table.length).fill(0);
        let multiLine = false;
        for (let i = 0; i < table.length; i++) {
            const tr = table[i];
            rowWidth[i] = horizontal;
            for (let j = 0; j < tr.length; j++) {
                const td = tr.item(j) as T;
                const element = <HTMLTableCellElement> td.element;
                for (let k = 0; k < element.rowSpan - 1; k++)  {
                    const l = (i + 1) + k;
                    if (columnIndex[l] !== undefined) {
                        columnIndex[l] += element.colSpan;
                    }
                }
                if (!td.has('background') && !td.has('backgroundColor')) {
                    const item = <HTMLElement> td.element;
                    if (colgroup) {
                        const style = getStyle(colgroup.children[columnIndex[i]]);
                        if (style.background) {
                            item.style.background = style.background;
                        }
                        else if (style.backgroundColor) {
                            item.style.backgroundColor = style.backgroundColor;
                        }
                    }
                    else {
                        let value = cssInherit(item, 'background', ['rgba(0, 0, 0, 0)', 'transparent'], ['TABLE']);
                        if (value !== '') {
                            item.style.background = value;
                        }
                        else {
                            value = cssInherit(item, 'backgroundColor', ['rgba(0, 0, 0, 0)', 'transparent'], ['TABLE']);
                            if (value !== '') {
                                item.style.backgroundColor = value;
                            }
                        }
                    }
                }
                const columnWidth = td.styleMap.width;
                const m = columnIndex[i];
                if (i === 0 || mapWidth[m] === undefined || !layoutFixed) {
                    if (!columnWidth || columnWidth === 'auto') {
                        if (mapWidth[m] === undefined) {
                            mapWidth[m] = columnWidth || '0px';
                            mapBounds[m] = 0;
                        }
                    }
                    else {
                        const percentColumnWidth = isPercent(columnWidth);
                        const unitMapWidth = isUnit(mapWidth[m]);
                        if (mapWidth[m] === undefined || td.bounds.width < mapBounds[m] || (td.bounds.width === mapBounds[m] && (
                                (mapWidth[m] === 'auto' && (percentColumnWidth || unitMapWidth)) ||
                                (percentColumnWidth && unitMapWidth) ||
                                (percentColumnWidth && isPercent(mapWidth[m]) && convertFloat(columnWidth) > convertFloat(mapWidth[m])) ||
                                (unitMapWidth && isUnit(columnWidth) && convertInt(columnWidth) > convertInt(mapWidth[m]))
                           )))
                        {
                            mapWidth[m] = columnWidth;
                        }
                        if (element.colSpan === 1) {
                            mapBounds[m] = td.bounds.width;
                        }
                    }
                }
                td.css({
                    marginTop: i === 0 ? '0px' : spacingHeight,
                    marginRight: j < tr.length - 1 ? spacingWidth : '0px',
                    marginBottom: i + element.rowSpan - 1 >= table.length - 1 ? '0px' : spacingHeight,
                    marginLeft: columnIndex[i] === 0 ? '0px' : spacingWidth
                });
                if (!multiLine) {
                    multiLine = td.multiLine;
                }
                if (td.length > 0 || td.inlineText) {
                    rowWidth[i] += td.bounds.width + horizontal;
                }
                columnIndex[i] += element.colSpan;
            }
        }
        const columnCount: number = Math.max.apply(null, columnIndex);
        let rowCount = table.length;
        if (mapWidth.every(value => isPercent(value)) && mapWidth.reduce((a, b) => a + parseFloat(b), 0) > 1) {
            let percentTotal = 100;
            mapWidth.forEach((value, index) => {
                const percent = parseFloat(value);
                if (percentTotal <= 0) {
                    mapWidth[index] = '0px';
                }
                else if (percentTotal - percent < 0) {
                    mapWidth[index] = `${percentTotal}%`;
                }
                percentTotal -= percent;
            });
        }
        else if (mapWidth.every(value => isUnit(value))) {
            const pxWidth = mapWidth.reduce((a, b) => a + parseInt(b), 0);
            if ((isPercent(tableWidth) && tableWidth !== '100%') || pxWidth < node.viewWidth) {
                mapWidth.filter(value => value !== '0px').forEach((value, index) => mapWidth[index] = `${(parseInt(value) / pxWidth) * 100}%`);
            }
            else if (tableWidth === 'auto') {
                mapWidth.filter(value => value !== '0px').forEach((value, index) => mapWidth[index] = mapBounds[index] === undefined ? 'undefined' : `${(mapBounds[index] / node.bounds.width) * 100}%`);
            }
            else if (pxWidth > node.viewWidth) {
                node.css('width', 'auto');
                if (!layoutFixed) {
                    node.cascade().forEach(item => item.css('width', 'auto'));
                }
            }
        }
        const mapPercent = mapWidth.reduce((a, b) => a + (isPercent(b) ? parseFloat(b) : 0), 0);
        const typeWidth = (() => {
            if (mapWidth.some(value => isPercent(value)) || mapWidth.every(value => isUnit(value) && value !== '0px')) {
                return 3;
            }
            if (mapWidth.every(value => value === mapWidth[0])) {
                if (multiLine) {
                    return node.some(td => td.has('height')) ? 2 : 3;
                }
                if (mapWidth[0] === 'auto') {
                    return node.has('width') ? 3 : 0;
                }
                if (node.hasWidth) {
                    return 2;
                }
            }
            if (mapWidth.every(value => value === 'auto' || (isUnit(value) && value !== '0px'))) {
                return 1;
            }
            return 0;
        })();
        if (multiLine || (typeWidth === 2 && !node.hasWidth)) {
            node.data(EXT_NAME.TABLE, 'expand', true);
        }
        const caption = node.find(item => item.tagName === 'CAPTION');
        node.clear();
        if (caption) {
            if (!caption.has('textAlign', CSS_STANDARD.LEFT)) {
                caption.css('textAlign', 'center');
            }
            if (!caption.hasWidth && !isUserAgent(USER_AGENT.EDGE)) {
                if (caption.textElement) {
                    if (!caption.has('maxWidth')) {
                        caption.css('maxWidth', formatPX(caption.bounds.width));
                    }
                }
                else {
                    if (caption.bounds.width > Math.max.apply(null, rowWidth)) {
                        setBoundsWidth(caption as T);
                    }
                }
            }
            rowCount++;
            caption.data(EXT_NAME.TABLE, 'colSpan', columnCount);
            caption.parent = node;
        }
        columnIndex = new Array(table.length).fill(0);
        let borderInside = 0;
        for (let i = 0; i < table.length; i++) {
            const tr = table[i];
            const children = tr.duplicate();
            for (let j = 0; j < children.length; j++) {
                const td = children[j] as T;
                const element = <HTMLTableCellElement> td.element;
                for (let k = 0; k < element.rowSpan - 1; k++)  {
                    const l = (i + 1) + k;
                    if (columnIndex[l] !== undefined) {
                        columnIndex[l] += element.colSpan;
                    }
                }
                if (element.rowSpan > 1) {
                    td.data(EXT_NAME.TABLE, 'rowSpan', element.rowSpan);
                }
                if (element.colSpan > 1) {
                    td.data(EXT_NAME.TABLE, 'colSpan', element.colSpan);
                }
                if (!td.has('verticalAlign')) {
                    td.css('verticalAlign', 'middle');
                }
                if (i === 0) {
                    if (td.has('borderTopStyle') && convertInt(td.css('borderTopWidth')) > 0) {
                        borderInside |= 2;
                    }
                }
                if (j === 0) {
                    if (td.has('borderLeftStyle') && convertInt(td.css('borderLeftWidth')) > 0) {
                        borderInside |= 4;
                    }
                }
                if (j === children.length - 1) {
                    if (td.has('borderRightStyle') && convertInt(td.css('borderRightWidth')) > 0) {
                        borderInside |= 8;
                    }
                }
                if (i === table.length - 1) {
                    if (td.has('borderBottomStyle') && convertInt(td.css('borderBottomWidth')) > 0) {
                        borderInside |= 16;
                    }
                }
                const columnWidth = mapWidth[columnIndex[i]];
                if (columnWidth !== 'undefined') {
                    switch (typeWidth) {
                        case 3:
                            if (columnWidth === 'auto') {
                                if (mapPercent >= 1) {
                                    setBoundsWidth(td);
                                    td.data(EXT_NAME.TABLE, 'exceed', true);
                                    td.data(EXT_NAME.TABLE, 'downsized', true);
                                }
                                else {
                                    setAutoWidth(td);
                                }
                            }
                            else if (isPercent(columnWidth)) {
                                td.data(EXT_NAME.TABLE, 'percent', columnWidth);
                                td.data(EXT_NAME.TABLE, 'expand', true);
                            }
                            else if (isUnit(columnWidth) && parseInt(columnWidth) > 0) {
                                if (td.bounds.width >= parseInt(columnWidth)) {
                                    setBoundsWidth(td);
                                    td.data(EXT_NAME.TABLE, 'expand', false);
                                    td.data(EXT_NAME.TABLE, 'downsized', false);
                                }
                                else {
                                    if (layoutFixed) {
                                        setAutoWidth(td);
                                        td.data(EXT_NAME.TABLE, 'downsized', true);
                                    }
                                    else {
                                        setBoundsWidth(td);
                                        td.data(EXT_NAME.TABLE, 'expand', false);
                                    }
                                }
                            }
                            else {
                                if (!td.has('width') || td.has('width', CSS_STANDARD.PERCENT)) {
                                    setBoundsWidth(td);
                                }
                                td.data(EXT_NAME.TABLE, 'expand', false);
                            }
                            break;
                        case 2:
                            td.css('width', '0px');
                            break;
                        case 1:
                            if (columnWidth === 'auto') {
                                td.css('width', '0px');
                            }
                            else {
                                if (layoutFixed) {
                                    td.data(EXT_NAME.TABLE, 'downsized', true);
                                }
                                else {
                                    setBoundsWidth(td);
                                }
                                td.data(EXT_NAME.TABLE, 'expand', false);
                            }
                            break;

                    }
                }
                columnIndex[i] += element.colSpan;
                td.parent = node;
            }
            if (columnIndex[i] < columnCount) {
                const td = children[children.length - 1];
                td.data(EXT_NAME.TABLE, 'spaceSpan', columnCount - columnIndex[i]);
            }
            tr.hide();
        }
        if (borderCollapse && borderInside !== 0) {
            node.css({
                borderTopWidth: hasBit(borderInside, 2) ? '0px' : '',
                borderRightWidth: hasBit(borderInside, 8) ? '0px' : '',
                borderBottomWidth: hasBit(borderInside, 16) ? '0px' : '',
                borderLeftWidth: hasBit(borderInside, 4) ? '0px' : ''
            });
        }
        const output = this.application.writeGridLayout(node, parent, columnCount, rowCount);
        return { output, complete: true };
    }
}