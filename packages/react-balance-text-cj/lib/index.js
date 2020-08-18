"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const balanceText_1 = __importDefault(require("./balanceText"));
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const server_1 = require("react-dom/server");
const BalanceText = ({ children, style, className, resize }) => {
    const container = react_1.default.createRef();
    function handleResize() {
        if (!resize) {
            return;
        }
        if (container.current)
            balanceText_1.default(container.current);
    }
    function doBalanceText() {
        if (container.current)
            balanceText_1.default(container.current);
    }
    react_1.default.useEffect(() => {
        const throttled = lodash_throttle_1.default(handleResize, 100);
        window.addEventListener('resize', throttled);
        return () => {
            window.removeEventListener('resize', throttled);
        };
    }, []);
    react_1.default.useEffect(() => {
        doBalanceText();
    }, [children, className, style]);
    let html;
    if (!children) {
        html = "";
    }
    else if (typeof children === "string") {
        html = children
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    else if (typeof children === "number" || typeof children === "boolean") {
        html = `${children}`;
    }
    else {
        html = server_1.renderToStaticMarkup(children);
    }
    return (react_1.default.createElement("span", { style: style, className: className, ref: container, dangerouslySetInnerHTML: { __html: html } }));
};
exports.default = BalanceText;
//# sourceMappingURL=index.js.map