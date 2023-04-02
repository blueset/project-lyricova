import { gql, useApolloClient, useQuery } from "@apollo/client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button } from "@mui/material";
import { makeStyles } from "@mui/material/styles";
import { measureTextWidths } from "../frontendUtils/measure";
import _ from "lodash";
import clsx from "clsx";
import dynamic from "next/dynamic";

const elm1000 = _.range(725);

const Box = ({ idx }: { idx: number }) => {
  return <span>-</span>;
};

function Sandbox1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleClick = useCallback((last: number) => {
    const v1 = Math.random() * elm1000.length,
      v2 = Math.random() * elm1000.length;
    const value1 = Math.max(v1, v2);
    const value2 = Math.min(v1, v2);
    if (containerRef.current) {
      Array.from(containerRef.current.getElementsByTagName("span")).forEach(
        (elm, idx) => {
          const v1 = Math.min(1, Math.max(0, value1 - idx));
          const v2 = Math.min(1, Math.max(0, value2 - idx));
          elm.style.color = v2 === 1 ? "blue" : v1 === 1 ? "red" : "white";
          elm.style.background =
            v2 > 0 && v2 < 1 ? "yellow" : v1 > 0 && v1 < 1 ? "green" : "none";
        }
      );
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    console.log(last - window.globalTimer);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.globalTimer = last;
    requestAnimationFrame(handleClick);
  }, []);
  useEffect(() => {
    requestAnimationFrame(handleClick);
  }, [handleClick]);

  return (
    <div ref={containerRef}>
      {elm1000.map((idx) => (
        <Box key={idx} idx={idx} />
      ))}
    </div>
  );
}

const Box2 = memo(
  ({ idx, v1, v2 }: { idx: number; v1: number; v2: number }) => {
    return (
      <span
        style={{
          color: v2 === 1 ? "blue" : v1 === 1 ? "red" : "white",
          background:
            v2 > 0 && v2 < 1 ? "yellow" : v1 > 0 && v1 < 1 ? "green" : "none",
        }}
      >
        -
      </span>
    );
  }
);
Box2.displayName = "Box2";

function Sandbox2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [v1, setV1] = useState(20);
  const [v2, setV2] = useState(1);
  const handleClick = useCallback((last: number) => {
    const value1 = Math.random(),
      value2 = Math.random();
    setV1((v) => v + value1);
    setV2((v) => v + value2);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    console.log(last - window.globalTimer);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.globalTimer = last;
    requestAnimationFrame(handleClick);
  }, []);
  useEffect(() => {
    requestAnimationFrame(handleClick);
  }, [handleClick]);

  return (
    <div ref={containerRef}>
      {elm1000.map((idx) => (
        <Box2
          key={idx}
          idx={idx}
          v1={Math.min(1, Math.max(0, v1 - idx))}
          v2={Math.min(1, Math.max(0, v2 - idx))}
        />
      ))}
    </div>
  );
}

export default function Sandbox() {
  return <Sandbox2 />;
}
