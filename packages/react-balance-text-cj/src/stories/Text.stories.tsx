import React, { useState } from "react";
import { Story, Meta } from '@storybook/react/types-6-0';
import "./Text.stories.css";

import BalanceText, { Props } from "../index";

export default {
    title: "Example/Text",
    component: BalanceText,
    argTypes: {
        resize: {
            type: "boolean"
        },
    },
} as Meta;

export const BasicTextBalancing = () => (
    <div>
        <h3>Before</h3>
        <p>
            All human beings are born free and <b>equal in dignity and rights</b>. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.
        </p>
        <p lang="zh">
            人人生而自由，<b>在尊严和权利上一律平等</b>。他们赋有理性和良心，并应以兄弟关系的精神相对待。人人有资格享有本宣言所载的一切权利和自由，不分种族、肤色、性别、语言、宗教、政治或其他见解、国籍或社会出身、财产、出生或其他身分等任何区别。并且不得因一人所属的国家或领土的政治的、行政的或者国际的地位之不同而有所区别，无论该领土是独立领土、托管领土、非自治领土或者处于其他任何主权受限制的情况之下。
        </p>
        <p lang="ja">
            すべての人間は、生まれながらにして自由であり、かつ、<b>尊厳と権利とについて平等である</b>。人間は、理性と良心とを授けられており、互いに同胞の精神をもって行動しなければならない。すべて人は、人種、皮膚の色、性、言語、宗教、政治上その他の意見、国民的もしくは社会的出身、財産、門地その他の地位又はこれに類するいかなる自由による差別をも受けることなく、この宣言に掲げるすべての権利と自由とを享有することができる。さらに、個人の属する国又は地域が独立国であると、信託統治地域であると、非自治地域であると、又は他のなんらかの主権制限の下にあるとを問わず、その国又は地域の政治上、管轄上又は国際上の地位に基ずくいかなる差別もしてはならない。
        </p>
        <h3>After</h3>
        <p>
            <BalanceText resize={true}>
                All human beings are born free and <b>equal in dignity and rights</b>. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.
            </BalanceText>
        </p>
        <p lang="zh">
            <BalanceText resize={true}>
                人人生而自由，<b>在尊严和权利上一律平等</b>。他们赋有理性和良心，并应以兄弟关系的精神相对待。人人有资格享有本宣言所载的一切权利和自由，不分种族、肤色、性别、语言、宗教、政治或其他见解、国籍或社会出身、财产、出生或其他身分等任何区别。并且不得因一人所属的国家或领土的政治的、行政的或者国际的地位之不同而有所区别，无论该领土是独立领土、托管领土、非自治领土或者处于其他任何主权受限制的情况之下。
            </BalanceText>
        </p>
        <p lang="ja">
            <BalanceText resize={true}>
                すべての人間は、生まれながらにして自由であり、かつ、<b>尊厳と権利とについて平等である</b>。人間は、理性と良心とを授けられており、互いに同胞の精神をもって行動しなければならない。すべて人は、人種、皮膚の色、性、言語、宗教、政治上その他の意見、国民的もしくは社会的出身、財産、門地その他の地位又はこれに類するいかなる自由による差別をも受けることなく、この宣言に掲げるすべての権利と自由とを享有することができる。さらに、個人の属する国又は地域が独立国であると、信託統治地域であると、非自治地域であると、又は他のなんらかの主権制限の下にあるとを問わず、その国又は地域の政治上、管轄上又は国際上の地位に基ずくいかなる差別もしてはならない。
            </BalanceText>
        </p>
    </div>
);

export const Comparison = () => {
    const style = {
        fontSize: "2.5em",
        width: "18em",
        fontWeight: 600
    };
    return (
        <div lang="ja">
            <h3>Unbalanced</h3>
            <div style={style}>
                信じたものは、都合のいい妄想を繰り返し映し出す鏡。
            </div>
            <h3>Balanced</h3>
            <div style={style}>
                <BalanceText resize={true}>
                    信じたものは、都合のいい妄想を繰り返し映し出す鏡。
                </BalanceText>
            </div>
        </div>
    );
};

export const ManualWordBoundary = () => {
    return (
        <div lang="ja" className="container">
            <section className="column">
                <h3>Unbalanced</h3>
                <div className="manual-word-boundary">
                    信じた{"\u200B"}もの{"\u200B"}は、{"\u200B"}都合の{"\u200B"}いい{"\u200B"}妄想を{"\u200B"}繰り返し{"\u200B"}映し出す{"\u200B"}鏡。{"\u200B"}
                歌姫を{"\u200B"}止め、{"\u200B"}叩き{"\u200B"}つける{"\u200B"}ように{"\u200B"}叫ぶ・・・{"\u200B"}＜最高速の{"\u200B"}別れの{"\u200B"}歌＞
            </div>
                <div className="manual-word-boundary">
                    信じたものは、{"\u200B"}都合のいい妄想を{"\u200B"}繰り返し映し出す鏡。
            </div>
            </section>
            <section className="column">
                <h3>Balanced</h3>
                <p>信じた/もの/は、/都合の/いい/妄想を/繰り返し/映し出す/鏡。/歌姫を/止め、/叩き/つける/ように/叫ぶ・・・/＜最高速の/別れの/歌＞</p>
                <div className="manual-word-boundary">
                    <BalanceText resize={true}>
                        信じた{"\u200B"}もの{"\u200B"}は、{"\u200B"}都合の{"\u200B"}いい{"\u200B"}妄想を{"\u200B"}繰り返し{"\u200B"}映し出す{"\u200B"}鏡。{"\u200B"}
                    歌姫を{"\u200B"}止め、{"\u200B"}叩き{"\u200B"}つける{"\u200B"}ように{"\u200B"}叫ぶ・・・{"\u200B"}＜最高速の{"\u200B"}別れの{"\u200B"}歌＞
                </BalanceText>
                </div>
                <p>信じたものは、/都合のいい妄想を/繰り返し映し出す鏡。</p>
                <div className="manual-word-boundary">
                    <BalanceText resize={true}>
                        信じたものは、{"\u200B"}都合のいい妄想を{"\u200B"}繰り返し映し出す鏡。
                </BalanceText>
                </div>
            </section>
        </div>
    );
};

export const HandleUpdates = () => {

    const [lang, setLang] = useState<"en" | "zh" | "ja">("en");

    const NODES = {
        en: <>All human beings are born free and <b>equal in dignity and rights</b>. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.</>,
        zh: <>人人生而自由，<b>在尊严和权利上一律平等</b>。他们赋有理性和良心，并应以兄弟关系的精神相对待。人人有资格享有本宣言所载的一切权利和自由，不分种族、肤色、性别、语言、宗教、政治或其他见解、国籍或社会出身、财产、出生或其他身分等任何区别。并且不得因一人所属的国家或领土的政治的、行政的或者国际的地位之不同而有所区别，无论该领土是独立领土、托管领土、非自治领土或者处于其他任何主权受限制的情况之下。</>,
        ja: <>すべての人間は、生まれながらにして自由であり、かつ、<b>尊厳と権利とについて平等である</b>。人間は、理性と良心とを授けられており、互いに同胞の精神をもって行動しなければならない。すべて人は、人種、皮膚の色、性、言語、宗教、政治上その他の意見、国民的もしくは社会的出身、財産、門地その他の地位又はこれに類するいかなる自由による差別をも受けることなく、この宣言に掲げるすべての権利と自由とを享有することができる。さらに、個人の属する国又は地域が独立国であると、信託統治地域であると、非自治地域であると、又は他のなんらかの主権制限の下にあるとを問わず、その国又は地域の政治上、管轄上又は国際上の地位に基ずくいかなる差別もしてはならない。</>,
    };

    function setEn() {
        setLang("en");
    }

    function setZh() {
        setLang("zh");
    }

    function setJa() {
        setLang("ja");
    }

    return (
        <div>
            <button lang="en" onClick={setEn}><em>Universal Declaration of Human Rights</em></button>
            <button lang="zh" onClick={setZh}>《世界人权宣言》</button>
            <button lang="ja" onClick={setJa}>『世界人権宣言』</button>
            <div lang={lang}>
                <BalanceText resize={true}>{lang}: {NODES[lang]}</BalanceText>
            </div>
        </div>
    );
}

export const Styles = () => {
    return <BalanceText resize={true} className="underline">All human beings are born free and <b>equal in dignity and rights</b>. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.</BalanceText>
}