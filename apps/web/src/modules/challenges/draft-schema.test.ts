import {describe,expect,it} from "vitest";
import {challengeDraftDataSchema,challengeDraftRequestSchema} from "./draft-schema";

const categoryId="11111111-1111-4111-8111-111111111111";

describe("challengeDraftSchema",()=>{
  it("permite guardar un reto todavía incompleto",()=>{
    const result=challengeDraftRequestSchema.safeParse({currentStep:1,data:{categoryId,name:"",description:""}});
    expect(result.success).toBe(true);
  });

  it("normaliza valores predeterminados seguros",()=>{
    const draft=challengeDraftDataSchema.parse({categoryId});
    expect(draft.mode).toBe("SOLO");
    expect(draft.durationDays).toBe(30);
    expect(draft.validWeekdays).toHaveLength(7);
  });

  it("rechaza más de tres invitados",()=>{
    const ids=[1,2,3,4].map(value=>`11111111-1111-4111-8111-11111111111${value}`);
    expect(challengeDraftDataSchema.safeParse({categoryId,targetIds:ids}).success).toBe(false);
  });

  it("rechaza reglas fuera de los límites",()=>{
    expect(challengeDraftDataSchema.safeParse({categoryId,durationDays:366}).success).toBe(false);
    expect(challengeDraftRequestSchema.safeParse({currentStep:6,data:{categoryId}}).success).toBe(false);
  });
});
