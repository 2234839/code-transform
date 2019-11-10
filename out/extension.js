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
const vscode = require("vscode");
const fun = {};
function activate(context) {
    eval_code(context);
    let disposable = vscode.commands.registerCommand('extension.transform', () => __awaiter(this, void 0, void 0, function* () {
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
        console.log("用户选择", res);
        if (res === undefined)
            return;
        replace(fun_obj[res]);
    }));
    let setFun = vscode.commands.registerCommand('extension.setFun', () => __awaiter(this, void 0, void 0, function* () {
        const uris = yield vscode.window.showOpenDialog({ filters: { js: ["js"] }, canSelectMany: true });
        if (uris === undefined)
            return;
        const fun_file = [];
        for (let i = 0; i < uris.length; i++) {
            const uri = uris[i];
            const file = yield vscode.workspace.fs.readFile(uri);
            let matcher = uri.path.match(/.*\/(.*?)\.js$/);
            if (matcher === null)
                return console.error("文件名可能不对");
            fun_file.push({
                name: matcher[1], content: file.toString()
            });
        }
        console.log("fun_file", fun_file);
        yield context.globalState.update("fun", fun_file);
        eval_code(context);
    }));
    context.subscriptions.push(disposable);
    context.subscriptions.push(setFun);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
function eval_code(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const fun_file = yield context.globalState.get("fun", []);
        fun_file.forEach(file => {
            let funObj;
            try {
                funObj = eval(file.content);
            }
            catch (error) {
                return console.error("解析代码失败", error);
            }
            let obj = { [file.name]: funObj };
            Object.assign(fun, obj);
        });
        console.dir(fun);
    });
}
function replace(getText) {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return;
    editor.edit((editBuilder) => {
        editor.selections.map(selection => {
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
            }
            catch (error) {
                console.error("转换失败", error);
                return "";
            }
            console.log(range, text, new_text);
            editBuilder.replace(range, new_text);
        });
    });
    vscode.window.showInformationMessage('转变代码!');
}
//# sourceMappingURL=extension.js.map