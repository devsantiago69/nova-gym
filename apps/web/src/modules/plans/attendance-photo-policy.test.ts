import { describe, expect, it } from "vitest";
import {
  canChooseAttendancePhotoFromDevice,
  canUseAttendancePhotoSource,
  isAttendancePhotoSource,
} from "./attendance-photo-policy";

describe("attendance photo policy", () => {
  it("permite únicamente cámara en el plan Free", () => {
    expect(canUseAttendancePhotoSource("FREE", "camera")).toBe(true);
    expect(canUseAttendancePhotoSource("FREE", "gallery")).toBe(false);
  });

  it("habilita cámara y archivos en cualquier plan superior", () => {
    expect(canChooseAttendancePhotoFromDevice("PRO")).toBe(true);
    expect(canUseAttendancePhotoSource("UNLIMITED", "gallery")).toBe(true);
  });

  it("no habilita archivos cuando no existe un plan activo", () => {
    expect(canChooseAttendancePhotoFromDevice(null)).toBe(false);
  });

  it("rechaza orígenes desconocidos", () => {
    expect(isAttendancePhotoSource("camera")).toBe(true);
    expect(isAttendancePhotoSource("gallery")).toBe(true);
    expect(isAttendancePhotoSource("upload")).toBe(false);
  });
});
