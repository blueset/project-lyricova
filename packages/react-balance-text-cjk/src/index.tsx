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

import React from 'react';
import balanceText from './balanceText';

interface Props {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    resize?: boolean;
    className?: string;
}

export default function BalanceText({ children, style, className, resize }: Props): React.ReactNode {
    const [visible, setVisible] = React.useState(false);
    const container = React.createRef<HTMLSpanElement>();

    function handleResize() {
        if (!resize) {
            return;
        }

        doBalanceText();
    }

   function doBalanceText() {
        if (!container.current) {
            return;
        }

        balanceText(container.current);
    }

    function makeVisible() {
        setVisible(true);
        setTimeout(() => doBalanceText(), 0);
    }

    React.useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    React.useEffect(() => { makeVisible();});

    const combinedStyle = {
        ...style,
        visible: visible ? 'visible' : 'hidden',
    };

    return <div style={combinedStyle} className={className}>
        <span ref={container}>
            {children}
        </span>
    </div>;
}
