/*
This file is based on react-balanced-text by Khan Academy, licensed under
the MIT License. All changes built upon it is licensed under Apache License 2.0.


The MIT License (MIT)

Copyright (c) 2016 Khan Academy. <https://github.com/Khan>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import React, { ReactElement } from 'react';
import balanceText from './balanceText';
import throttle from "lodash.throttle";
import { renderToStaticMarkup } from "react-dom/server";

export interface Props {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    /** Update this property to trigger a reflow without changing content. */
    reflowTicket?: any;
    /** Reflow the text on window.resize event? */
    resize?: boolean;
    className?: string;
}

const BalanceText: React.FC<Props> = ({ children, style, className, resize, reflowTicket }) => {
    const container = React.createRef<HTMLSpanElement>();

    function handleResize() {
        if (!resize) {
            return;
        }
        if (container.current) balanceText(container.current);
    }

    function doBalanceText() {
        if (container.current) balanceText(container.current);
    }

    React.useEffect(() => {
        const throttled = throttle(handleResize, 100);
        window.addEventListener('resize', throttled);
        return () => {
            window.removeEventListener('resize', throttled);
        };
    }, []);

    React.useEffect(() => {
        doBalanceText();
    }, [children, className, style]);
    
    React.useEffect(() => {
        if (reflowTicket) {
            doBalanceText();
        }
    }, [reflowTicket]);

    let html: string;
    if (!children) {
        html = "";
    } else if (typeof children === "string") {
        html = children
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    } else if (typeof children === "number" || typeof children === "boolean") {
        html = `${children}`;
    } else {
        html = renderToStaticMarkup(children as ReactElement);
    }

    return (
        <span style={style} className={className} ref={container} dangerouslySetInnerHTML={{__html: html}}>
        </span>
    );
}

export default BalanceText;