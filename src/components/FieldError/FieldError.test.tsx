import { render, screen } from "@testing-library/react";
import { ChakraProvider, Input } from "@chakra-ui/react";
import { describe, expect, it } from "vitest";
import FieldError from "./FieldError";

function Field({ error }: { error: string | null }) {
  return (
    <ChakraProvider>
      <Input
        aria-label="Amount"
        isInvalid={Boolean(error)}
        aria-describedby="amount-error"
      />
      <FieldError id="amount-error" message={error} />
    </ChakraProvider>
  );
}

describe("FieldError", () => {
  it("keeps a polite live region mounted even when there is no error", () => {
    const { container } = render(<Field error={null} />);

    const region = container.querySelector("#amount-error");
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("aria-atomic")).toBe("true");
    expect(region?.textContent).toBe("");
  });

  it("renders the message inside the same region node when an error appears", () => {
    const { container, rerender } = render(<Field error={null} />);
    const region = container.querySelector("#amount-error");

    rerender(<Field error="Enter an amount greater than 0." />);

    // Same node, so AT that was already watching it announces the change.
    expect(container.querySelector("#amount-error")).toBe(region);
    expect(region?.textContent).toBe("Enter an amount greater than 0.");
  });

  it("is referenced by the input's accessible description", () => {
    render(<Field error="Amount exceeds your balance." />);

    const input = screen.getByLabelText("Amount");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(
      "Amount exceeds your balance.",
    );
  });
});
