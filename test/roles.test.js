import { describe, it, expect } from "vitest";
import { loadRole, loadAllRoles, getCritiqueRoles } from "../lib/roles.js";

describe("roles", () => {
  describe("loadRole", () => {
    it("loads a role with frontmatter", async () => {
      const role = await loadRole("product-manager");
      expect(role.slug).toBe("product-manager");
      expect(role.name).toBe("Product Manager");
      expect(role.emoji).toBeTruthy(); // Emoji format varies
      expect(role.phase).toBe("critique");
      expect(role.prompt).toContain("Product Manager");
    });

    it("loads roundtable role with roundtable phase", async () => {
      const role = await loadRole("roundtable");
      expect(role.phase).toBe("roundtable");
    });
  });

  describe("loadAllRoles", () => {
    it("loads all role files", async () => {
      const roles = await loadAllRoles();
      expect(roles.length).toBeGreaterThan(10);
      expect(roles.some((r) => r.slug === "product-manager")).toBe(true);
      expect(roles.some((r) => r.slug === "designer")).toBe(true);
      expect(roles.some((r) => r.slug === "roundtable")).toBe(true);
    });

    it("each role has required fields", async () => {
      const roles = await loadAllRoles();
      for (const role of roles) {
        expect(role.slug).toBeTruthy();
        expect(role.name).toBeTruthy();
        expect(role.phase).toBeTruthy();
        expect(role.prompt).toBeTruthy();
      }
    });
  });

  describe("getCritiqueRoles", () => {
    it("returns only critique phase roles", async () => {
      const roles = await getCritiqueRoles();
      for (const role of roles) {
        expect(role.phase).toBe("critique");
      }
      expect(roles.some((r) => r.slug === "roundtable")).toBe(false);
    });
  });
});
