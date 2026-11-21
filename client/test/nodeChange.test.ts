import { describe, it, expect } from "vitest";
import { nodeChange } from "../src/render/nodeChange";

describe("nodeChange", () => {
  it("a live hit (hp went down) shows feedback", () =>
    expect(nodeChange(null, 2, 3, true)).toEqual({ hit: true, depleted: false }));

  it("syncing existing state when joining shows NO feedback, only the look", () => {
    expect(nodeChange(null, 2, 3, false)).toEqual({ hit: false, depleted: false });
    expect(nodeChange(null, 0, 3, false)).toEqual({ hit: false, depleted: true });
  });

  it("the last hit depletes", () => expect(nodeChange(1, 0, 3, true)).toEqual({ hit: true, depleted: true }));

  it("regrowing (removed from state) is not a hit", () =>
    expect(nodeChange(0, null, 3, true)).toEqual({ hit: false, depleted: false }));
});
