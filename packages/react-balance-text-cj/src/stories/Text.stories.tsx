import React from "react";
import { Story, Meta } from '@storybook/react/types-6-0';

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
    <BalanceText resize={true}>
        Alohamora wand elf parchment, <b>Wingardium Leviosa hippogriff</b>, house dementors betrayal. Holly, Snape centaur portkey ghost Hermione spell bezoar Scabbers. Peruvian-Night-Powder werewolf, Dobby pear-tickle half-moon-glasses, Knight-Bus. Padfoot snargaluff seeker: Hagrid broomstick mischief managed. Snitch Fluffy rock-cake, 9 ¾ dress robes I must not tell lies. Mudbloods yew pumpkin juice phials Ravenclaw’s Diadem 10 galleons Thieves Downfall. Ministry-of-Magic mimubulus mimbletonia Pigwidgeon knut phoenix feather other minister Azkaban. Hedwig Daily Prophet treacle tart full-moon Ollivanders You-Know-Who cursed. Fawkes maze raw-steak Voldemort Goblin Wars snitch Forbidden forest grindylows wool socks.
    </BalanceText>
);

export const Chinese = () => (
    <BalanceText resize={true}>
        人人生而自由，<b>在尊严和权利上一律平等</b>。他们赋有理性和良心，并应以兄弟关系的精神相对待。人人有资格享有本宣言所载的一切权利和自由，不分种族、肤色、性别、语言、宗教、政治或其他见解、国籍或社会出身、财产、出生或其他身分等任何区别。并且不得因一人所属的国家或领土的政治的、行政的或者国际的地位之不同而有所区别，无论该领土是独立领土、托管领土、非自治领土或者处于其他任何主权受限制的情况之下。
    </BalanceText>
);

export const Japanese = () => (
    <BalanceText resize={true}>
        すべての人間は、生まれながらにして自由であり、かつ、<b>尊厳と権利とについて平等である</b>。人間は、理性と良心とを授けられており、互いに同胞の精神をもって行動しなければならない。すべて人は、人種、皮膚の色、性、言語、宗教、政治上その他の意見、国民的もしくは社会的出身、財産、門地その他の地位又はこれに類するいかなる自由による差別をも受けることなく、この宣言に掲げるすべての権利と自由とを享有することができる。さらに、個人の属する国又は地域が独立国であると、信託統治地域であると、非自治地域であると、又は他のなんらかの主権制限の下にあるとを問わず、その国又は地域の政治上、管轄上又は国際上の地位に基ずくいかなる差別もしてはならない。
    </BalanceText>
);
