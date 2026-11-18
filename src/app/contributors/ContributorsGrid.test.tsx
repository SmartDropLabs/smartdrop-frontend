import { fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it } from "vitest";
import { ContributorsGrid, filterContributors, type Contributor } from "./ContributorsGrid";

function make(login: string, contributions: number): Contributor {
  return {
    login,
    contributions,
    html_url: `https://github.com/${login}`,
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
  };
}

const rows = [make("alice", 30), make("Bob-Dev", 20), make("carol", 10), make("dave", 5)];

function renderGrid() {
  return render(
    <ChakraProvider>
      <ContributorsGrid contributors={rows} />
    </ChakraProvider>,
  );
}

describe("filterContributors (#779)", () => {
  it("returns everyone for an empty or whitespace query", () => {
    expect(filterContributors(rows, "")).toHaveLength(4);
    expect(filterContributors(rows, "   ")).toHaveLength(4);
  });

  it("matches case-insensitively on a substring of the login", () => {
    expect(filterContributors(rows, "bob").map((c) => c.login)).toEqual(["Bob-Dev"]);
    expect(filterContributors(rows, "A").map((c) => c.login)).toEqual(["alice", "carol", "dave"]);
  });

  it("ignores a leading @", () => {
    expect(filterContributors(rows, "@carol").map((c) => c.login)).toEqual(["carol"]);
  });
});

describe("ContributorsGrid (#779)", () => {
  it("filters the grid as the user types", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Search contributors by name"), {
      target: { value: "car" },
    });

    expect(screen.getByText("@carol")).toBeInTheDocument();
    expect(screen.queryByText("@alice")).not.toBeInTheDocument();
    expect(screen.getByText('1 of 4 contributors match "car"')).toBeInTheDocument();
  });

  it("keeps the overall rank badge when filtered", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Search contributors by name"), {
      target: { value: "carol" },
    });

    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Search contributors by name"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText(/No contributors match/)).toBeInTheDocument();
  });
});
