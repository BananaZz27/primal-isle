import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import { generateWorld, TILE_SIZE } from "@primal/shared";
import type { WorldState } from "@primal/server/schema";
import { buildTilemap } from "../render/tilemap";
import { CAMERA_ZOOM } from "../config";

export interface WorldSceneData {
  room: Room<any, WorldState>;
}

/** ฉากในเกม: วาดเกาะจาก seed ของห้อง */
export class WorldScene extends Phaser.Scene {
  protected room!: Room<any, WorldState>;

  constructor() {
    super("World");
  }

  init(data: WorldSceneData) {
    this.room = data.room;
  }

  create() {
    const map = generateWorld(this.room.state.seed);
    buildTilemap(this, map);

    const worldPx = map.size * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldPx, worldPx);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(worldPx / 2, worldPx / 2);
  }
}
