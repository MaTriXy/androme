import { EXT_NAME } from '../lib/constant';
import { BOX_STANDARD, NODE_ALIGNMENT, NODE_CONTAINER } from '../lib/enumeration';

import Extension from '../base/extension';
import Layout from '../base/layout';
import Node from '../base/node';
import NodeList from '../base/nodelist';

import { isStyleElement } from '../lib/dom';
import { flatMap, hasValue, sortAsc, withinFraction } from '../lib/util';

export default abstract class Grid<T extends Node> extends Extension<T> {
    public static createDataAttribute(): GridData {
        return {
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            columnEnd: [],
            columnCount: 0
        };
    }

    public static createDataCellAttribute<T extends Node>(): GridCellData<T> {
        return {
            inherit: true,
            rowSpan: 0,
            columnSpan: 0,
            index: -1,
            cellStart: false,
            cellEnd: false,
            rowEnd: false,
            rowStart: false
        };
    }

    public readonly options = {
        columnBalanceEqual: false
    };

    public condition(node: T) {
        return this.included(<HTMLElement> node.element) || node.length > 1 && (
            node.display === 'table' && node.every(item => item.display === 'table-row' && item.every(child => child.display === 'table-cell')) ||
            node.every(item => item.pageFlow && !item.visibleStyle.background && (!item.inlineFlow || item.blockStatic)) && (
                node.css('listStyle') === 'none' ||
                node.every(item => item.display === 'list-item' && item.css('listStyleType') === 'none') ||
                !hasValue(node.dataset.import) && !node.flexElement && node.length > 1 && node.some(item => item.length > 1) && !node.some(item => item.display === 'list-item' || item.textElement)
            )
        );
    }

    public processNode(node: T, parent: T, mapX: LayoutMapX<T>): ExtensionResult<T> {
        const columnBalance = this.options.columnBalanceEqual;
        const mainData = Grid.createDataAttribute();
        let columns: T[][] = [];
        if (columnBalance) {
            const dimensions: number[][] = [];
            node.each((item, index) => {
                dimensions[index] = [];
                item.each(child => dimensions[index].push(child.bounds.width));
                columns.push(item.duplicate() as T[]);
            });
            const base = columns[
                dimensions.findIndex(item => {
                    const column = dimensions.reduce((a, b) => {
                        if (a.length === b.length) {
                            const sumA = a.reduce((c, d) => c + d, 0);
                            const sumB = b.reduce((c, d) => c + d, 0);
                            return sumA < sumB ? a : b;
                        }
                        else {
                            return a.length < b.length ? a : b;
                        }
                    });
                    return item === column;
                })
            ];
            if (base && base.length > 1) {
                let maxIndex = -1;
                let assigned: number[] = [];
                let every = false;
                for (let l = 0; l < base.length; l++) {
                    const bounds = base[l].bounds;
                    const found: number[] = [];
                    if (l < base.length - 1) {
                        for (let m = 0; m < columns.length; m++) {
                            if (columns[m] === base) {
                                found.push(l);
                            }
                            else {
                                const result = columns[m].findIndex((item, index) => index >= l && Math.floor(item.bounds.width) === Math.floor(bounds.width) && index < columns[m].length - 1);
                                if (result !== -1) {
                                    found.push(result);
                                }
                                else {
                                    found.length = 0;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        for (let m = 0; m < columns.length; m++) {
                            if (columns[m].length > base.length) {
                                const removed = columns[m].splice(assigned[m] + (every ? 2 : 1), columns[m].length - base.length);
                                columns[m][assigned[m] + (every ? 1 : 0)].data(EXT_NAME.GRID, 'cellData', { siblings: [...removed] });
                            }
                        }
                    }
                    if (found.length === columns.length) {
                        const minIndex = found.reduce((a, b) => Math.min(a, b));
                        maxIndex = found.reduce((a, b) => Math.max(a, b));
                        if (maxIndex > minIndex) {
                            for (let m = 0; m < columns.length; m++) {
                                if (found[m] > minIndex) {
                                    const removed = columns[m].splice(minIndex, found[m] - minIndex);
                                    columns[m][assigned[m] + (every ? 1 : 0)].data(EXT_NAME.GRID, 'cellData', { siblings: [...removed] });
                                }
                            }
                        }
                        assigned = found;
                        every = true;
                    }
                    else {
                        assigned = new Array(columns.length).fill(l);
                        every = false;
                    }
                }
            }
            else {
                columns.length = 0;
            }
        }
        else {
            function getRowIndex(current: T) {
                return (
                    columns[0].findIndex(item => withinFraction(item.linear.top, current.linear.top) ||
                    current.linear.top >= item.linear.top && current.linear.bottom <= item.linear.bottom)
                );
            }
            const nextMapX: ObjectIndex<T[]> = mapX[node.depth + 2];
            const nextCoordsX = nextMapX ? Object.keys(nextMapX) : [];
            const columnEnd: number[] = [];
            if (nextCoordsX.length > 1) {
                const columnRight: number[] = [];
                for (let l = 0; l < nextCoordsX.length; l++) {
                    const nextAxisX = sortAsc(nextMapX[parseInt(nextCoordsX[l])].filter(item => item.documentParent.documentParent.id === node.id), 'linear.top');
                    if (l === 0 && nextAxisX.length === 0) {
                        return { output: '' };
                    }
                    columnRight[l] = l === 0 ? 0 : columnRight[l - 1];
                    for (let m = 0; m < nextAxisX.length; m++) {
                        const nextX = nextAxisX[m];
                        let [left, right] = [nextX.linear.left, nextX.linear.right];
                        let index = l;
                        if (index > 0 && isStyleElement(nextX.element) && nextX.float === 'right') {
                            nextX.element.style.cssFloat = 'left';
                            const bounds = nextX.element.getBoundingClientRect();
                            if (bounds.left - nextX.marginLeft !== left) {
                                [left, right] = [bounds.left - nextX.marginLeft, bounds.right + nextX.marginRight];
                                for (let n = 1; n < columnRight.length; n++) {
                                    index = n;
                                    if (left > columnRight[n - 1]) {
                                        break;
                                    }
                                }
                            }
                            nextX.element.style.cssFloat = 'right';
                        }
                        if (index === 0 || left >= columnRight[index - 1]) {
                            if (columns[index] === undefined) {
                                columns[index] = [];
                            }
                            if (index === 0 || columns[0].length === nextAxisX.length) {
                                columns[index][m] = nextX;
                            }
                            else {
                                const row = getRowIndex(nextX);
                                if (row !== -1) {
                                    columns[index][row] = nextX;
                                }
                            }
                        }
                        else {
                            const current = columns.length - 1;
                            if (columns[current]) {
                                const minLeft = columns[current].reduce((a: number, b) => Math.min(a, b.linear.left), Number.MAX_VALUE);
                                const maxRight = columns[current].reduce((a: number, b) => Math.max(a, b.linear.right), 0);
                                if (left > minLeft && right > maxRight) {
                                    const filtered = columns.filter(item => item);
                                    const rowIndex = getRowIndex(nextX);
                                    if (rowIndex !== -1 && filtered[filtered.length - 1][rowIndex] === undefined) {
                                        columns[current].length = 0;
                                    }
                                }
                            }
                        }
                        columnRight[l] = Math.max(nextX.linear.right, columnRight[l]);
                    }
                }
                for (let l = 0, m = -1; l < columnRight.length; l++) {
                    if (m === -1 && columns[l] === undefined) {
                        m = l - 1;
                    }
                    else if (columns[l] === undefined) {
                        if (m !== -1 && l === columnRight.length - 1) {
                            columnRight[m] = columnRight[l];
                        }
                    }
                    else if (m !== -1) {
                        columnRight[m] = columnRight[l - 1];
                        m = -1;
                    }
                }
                for (let l = 0; l < columns.length; l++) {
                    if (columns[l] && columns[l].length) {
                        columnEnd.push(columnRight[l]);
                    }
                }
                columns = columns.filter(item => item && item.length > 0);
                const columnLength = columns.reduce((a, b) => Math.max(a, b.length), 0);
                for (let l = 0; l < columnLength; l++) {
                    for (let m = 0; m < columns.length; m++) {
                        if (columns[m][l] === undefined) {
                            columns[m][l] = { spacer: 1 } as any;
                        }
                    }
                }
            }
            if (columnEnd) {
                mainData.columnEnd = columnEnd;
                mainData.columnEnd[mainData.columnEnd.length - 1] = node.box.right;
            }
        }
        let output = '';
        if (columns.length > 1 && columns[0].length === node.length) {
            mainData.columnCount = columnBalance ? columns[0].length : columns.length;
            node.duplicate().forEach(item => node.remove(item) && item.hide());
            for (let l = 0, count = 0; l < columns.length; l++) {
                let spacer = 0;
                for (let m = 0, start = 0; m < columns[l].length; m++) {
                    const item = columns[l][m];
                    if (!(<any> item).spacer) {
                        item.parent = node;
                        const data: GridCellData<T> = Object.assign(Grid.createDataCellAttribute(), item.data(EXT_NAME.GRID, 'cellData') || {});
                        if (columnBalance) {
                            data.rowStart = m === 0;
                            data.rowEnd = m === columns[l].length - 1;
                            data.cellStart = l === 0 && m === 0;
                            data.cellEnd = l === columns.length - 1 && data.rowEnd;
                            data.index = m;
                        }
                        else {
                            let rowSpan = 1;
                            let columnSpan = 1 + spacer;
                            for (let n = l + 1; n < columns.length; n++) {
                                if ((<any> columns[n][m]).spacer === 1) {
                                    columnSpan++;
                                    (<any> columns[n][m]).spacer = 2;
                                }
                                else {
                                    break;
                                }
                            }
                            if (columnSpan === 1) {
                                for (let n = m + 1; n < columns[l].length; n++) {
                                    if ((<any> columns[l][n]).spacer === 1) {
                                        rowSpan++;
                                        (<any> columns[l][n]).spacer = 2;
                                    }
                                    else {
                                        break;
                                    }
                                }
                            }
                            data.rowSpan = rowSpan;
                            data.columnSpan = columnSpan;
                            data.rowStart = start++ === 0;
                            data.rowEnd = columnSpan + l === columns.length;
                            data.cellStart = count++ === 0;
                            data.cellEnd = data.rowEnd && m === columns[l].length - 1;
                            data.index = l;
                            spacer = 0;
                        }
                        item.data(EXT_NAME.GRID, 'cellData', data);
                    }
                    else if ((<any> item).spacer === 1) {
                        spacer++;
                    }
                }
            }
            sortAsc(node.children, 'documentParent.siblingIndex', 'siblingIndex');
            if (node.tableElement && node.css('borderCollapse') === 'collapse') {
                node.modifyBox(BOX_STANDARD.PADDING_TOP, null);
                node.modifyBox(BOX_STANDARD.PADDING_RIGHT, null);
                node.modifyBox(BOX_STANDARD.PADDING_BOTTOM, null);
                node.modifyBox(BOX_STANDARD.PADDING_LEFT, null);
            }
            node.data(EXT_NAME.GRID, 'mainData', mainData);
            node.render(parent);
            const layout = new Layout(
                parent,
                node,
                NODE_CONTAINER.GRID,
                NODE_ALIGNMENT.AUTO_LAYOUT,
                node.length,
                node.children as T[]
            );
            layout.columnCount = mainData.columnCount;
            output = this.application.renderNode(layout);
        }
        return { output, complete: output !== '' };
    }

    public processChild(node: T, parent: T): ExtensionResult<T> {
        const mainData: GridData = parent.data(EXT_NAME.GRID, 'mainData');
        const cellData: GridCellData<T> = node.data(EXT_NAME.GRID, 'cellData');
        if (mainData && cellData) {
            let siblings: T[];
            if (this.options.columnBalanceEqual) {
                siblings = cellData.siblings ? cellData.siblings : [];
            }
            else {
                const columnEnd = mainData.columnEnd[Math.min(cellData.index + (cellData.columnSpan - 1), mainData.columnEnd.length - 1)];
                siblings = flatMap(Array.from(node.documentParent.element.children), element => {
                    const item = Node.getElementAsNode(element);
                    return (
                        item &&
                        item.visible &&
                        !item.rendered &&
                        item.linear.left >= node.linear.right &&
                        item.linear.right <= columnEnd ? item : null
                    );
                }) as T[];
            }
            if (siblings.length) {
                siblings.unshift(node);
                const group = this.application.viewController.createNodeGroup(node, siblings, parent);
                siblings.forEach(item => item.inherit(group, 'data'));
                const layout = new Layout(
                    parent,
                    group,
                    0,
                    NODE_ALIGNMENT.SEGMENTED,
                    siblings.length,
                    siblings
                );
                layout.linearX = NodeList.linearX(siblings);
                let output = '';
                if (NodeList.linearY(siblings)) {
                    layout.setType(NODE_CONTAINER.LINEAR, NODE_ALIGNMENT.VERTICAL);
                }
                else if (this.application.viewController.checkFrameHorizontal(layout)) {
                    output = this.application.processLayoutHorizontal(layout);
                }
                else {
                    if (this.application.viewController.checkRelativeHorizontal(layout)) {
                        layout.setType(NODE_CONTAINER.RELATIVE, NODE_ALIGNMENT.HORIZONTAL);
                    }
                    else if (layout.linearX) {
                        layout.setType(NODE_CONTAINER.LINEAR, NODE_ALIGNMENT.HORIZONTAL);
                    }
                    else {
                        layout.setType(NODE_CONTAINER.CONSTRAINT, NODE_ALIGNMENT.UNKNOWN);
                    }
                }
                if (output === '') {
                    output = this.application.renderNode(layout);
                }
                return { output, parent: group, complete: true };
            }
        }
        return { output: '' };
    }
}