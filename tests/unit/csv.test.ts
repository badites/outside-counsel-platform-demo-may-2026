import { describe, it, expect } from "vitest";
import { parseCsv, serializeCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const result = parseCsv("a,b,c\n1,2,3");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields", () => {
    const result = parseCsv('"hello, world",b,c\n1,2,3');
    expect(result[0][0]).toBe("hello, world");
  });

  it("handles escaped quotes", () => {
    const result = parseCsv('"say ""hello""",b\n1,2');
    expect(result[0][0]).toBe('say "hello"');
  });

  it("handles Windows-style CRLF line endings", () => {
    const result = parseCsv("a,b\r\n1,2\r\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips empty rows", () => {
    const result = parseCsv("a,b\n\n1,2\n\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("trims whitespace from fields", () => {
    const result = parseCsv("  a , b \n 1 , 2 ");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("serializeCsv", () => {
  it("produces valid CSV", () => {
    const csv = serializeCsv(["Name", "Score"], [["Baker", "85"], ["A&O", "92"]]);
    expect(csv).toBe("Name,Score\nBaker,85\nA&O,92");
  });

  it("quotes fields with commas", () => {
    const csv = serializeCsv(["Name"], [["Baker, McKenzie"]]);
    expect(csv).toContain('"Baker, McKenzie"');
  });

  it("escapes quotes in fields", () => {
    const csv = serializeCsv(["Name"], [['Say "Hello"']]);
    expect(csv).toContain('"Say ""Hello"""');
  });

  it("round-trips correctly", () => {
    const headers = ["Firm", "Band", "Notes"];
    const rows = [
      ["Baker McKenzie", "1", "Top firm, excellent"],
      ['A&O Shearman', "2", 'Said "great quality"'],
    ];
    const csv = serializeCsv(headers, rows);
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual(headers);
    expect(parsed[1]).toEqual(rows[0]);
    expect(parsed[2]).toEqual(rows[1]);
  });
});
