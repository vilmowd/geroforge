"use client";

import { useEffect, useState } from "react";

function editionTitle(now: Date) {
  const hour = now.getHours();
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(now);
  const sitting = hour < 5 || hour >= 21 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `${day} ${sitting}`;
}

export function EditionHeading() {
  const [title, setTitle] = useState("Today's edition");

  useEffect(() => {
    setTitle(editionTitle(new Date()));
  }, []);

  return <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>;
}
