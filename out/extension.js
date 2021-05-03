"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const vscode_1 = require("vscode");
const gogocode = require("gogocode");
const fun = {};
let list = [];
function activate(context) {
    list = vscode_1.workspace.getConfiguration("表征转换").get("转换规则");
    const 启用表征转换 = vscode_1.workspace.getConfiguration("表征转换").get("启用");
    // console.log("[启用表征转换]", 启用表征转换);
    eval_code(context);
    let disposable = vscode.commands.registerCommand("extension.transform", () => __awaiter(this, void 0, void 0, function* () {
        const pickItem = [];
        const fun_obj = {};
        for (const key in fun) {
            const fun_child = fun[key];
            for (const _key in fun_child) {
                const element = fun_child[_key];
                fun_obj[`${_key}-->${key}`] = element;
                pickItem.push(`${_key}-->${key}`);
            }
        }
        const res = yield vscode.window.showQuickPick(pickItem);
        if (res === undefined) {
            return;
        }
        replace(fun_obj[res]);
    }));
    let setFun = vscode.commands.registerCommand("extension.setFun", () => __awaiter(this, void 0, void 0, function* () {
        const uris = yield vscode.window.showOpenDialog({
            filters: { js: ["js"] },
            canSelectMany: true,
        });
        if (uris === undefined) {
            return;
        }
        const fun_file = [];
        for (let i = 0; i < uris.length; i++) {
            const uri = uris[i];
            console.log("[uri]", uri);
            const file = yield vscode.workspace.fs.readFile(uri);
            let matcher = uri.path.match(/.*\/(.*?)\.js$/);
            if (matcher === null) {
                return console.error("文件名可能不对");
            }
            fun_file.push({
                name: matcher[1],
                content: file.toString(),
            });
        }
        yield context.globalState.update("fun", fun_file);
        eval_code(context);
    }));
    context.subscriptions.push(disposable);
    context.subscriptions.push(setFun);
    const f = debounce(render, 600);
    if (启用表征转换) {
        vscode.workspace.onDidChangeTextDocument(f);
    }
}
exports.activate = activate;
const documentDecor = new WeakMap();
function render(textDocument) {
    const d = textDocument.document;
    /** 这一轮的装饰器 */
    if (documentDecor.get(d) === undefined) {
        documentDecor.set(d, {
            d: vscode_1.window.createTextEditorDecorationType({
                color: "#ff9977",
                after: {
                    color: "#FF00FF",
                    border: "solid black 1px",
                    contentText: "",
                },
                /** 通过这种 hack 方式隐藏正文，使用户第一眼看到的是上面的after的内容 */
                textDecoration: "none; display: none;",
            }),
            s: [],
        });
    }
    const c = documentDecor.get(d);
    let dList = c.s;
    dList = [];
    list.forEach((s) => {
        const r = eval(s);
        match(r);
    });
    /** 生成新的了，所以清除掉 */
    const activeEditor = vscode.window.activeTextEditor;
    const selections = vscode.window.activeTextEditor.selections.map((el) => activeEditor.document.lineAt(el.active).range);
    const targetList = dList
        .map((el) => el.d)
        .filter((el) => !selections.find((s) => s.contains(el.range)));
    activeEditor.setDecorations(c.d, targetList);
    function match(regEx) {
        const text = d.getText();
        let match;
        while ((match = regEx.exec(text))) {
            const startPos = d.positionAt(match.index);
            const endPos = d.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            if (range) {
                dList.push({
                    r: range,
                    d: {
                        range,
                        hoverMessage: "code-transform test hover",
                        renderOptions: {
                            after: {
                                contentText: `> 💝💫💨 ${d.getText(range)} <`,
                            },
                        },
                    },
                });
            }
            else {
                console.log("空range");
            }
        }
    }
}
function debounce(fun, delay) {
    let id = undefined;
    return function (...args) {
        if (id !== undefined) {
            clearTimeout(id);
        }
        id = setTimeout(function () {
            console.log("更新");
            fun(...args);
        }, delay);
    };
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
function eval_code(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const fun_file = (yield context.globalState.get("fun", []));
        fun_file.forEach((file) => {
            let funObj;
            try {
                funObj = eval(file.content)({
                    /** ast 转换工具 */
                    gogocode,
                });
            }
            catch (error) {
                return console.error("解析代码失败", error);
            }
            let obj = { [file.name]: funObj };
            Object.assign(fun, obj);
        });
    });
}
/** 替换选中的代码为转换后的 */
function replace(getText) {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        return;
    }
    editor.edit((editBuilder) => {
        editor.selections.map((selection) => {
            /** 当前选中的文本 */
            let text = editor.document.getText(selection);
            /** 选中范围 */
            let range = selection;
            if (text === "") {
                /** 没有文本认为是选中了一行 */
                text = editor.document.lineAt(selection.active).text;
                range = editor.document.lineAt(selection.active).range;
            }
            let new_text;
            try {
                new_text = getText(text);
                editBuilder.replace(range, new_text);
            }
            catch (error) {
                console.error("转换失败", error);
                vscode.window.showInformationMessage("转换失败!" + error);
                return "";
            }
        });
    });
    // vscode.window.showInformationMessage("转变代码!");
}
function someRange(r1, r2) {
    return r1.isEqual(r2);
}
//# sourceMappingURL=extension.js.map