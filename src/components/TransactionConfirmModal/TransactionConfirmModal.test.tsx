import { fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi } from "vitest";
import TransactionConfirmModal, {
  type TransactionConfirmModalProps,
} from "./TransactionConfirmModal";

function renderModal(overrides: Partial<TransactionConfirmModalProps> = {}) {
  const props: TransactionConfirmModalProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Confirm Deposit",
    details: [
      { label: "Pool", value: "XLM Pool" },
      { label: "Deposit amount", value: "25 XLM" },
    ],
    warning: "Funds stay locked for 7 days.",
    confirmLabel: "Confirm Deposit",
    ...overrides,
  };
  render(
    <ChakraProvider>
      <TransactionConfirmModal {...props} />
    </ChakraProvider>,
  );
  return props;
}

describe("TransactionConfirmModal", () => {
  it("renders the transaction details and warning", () => {
    renderModal();

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("XLM Pool")).toBeTruthy();
    expect(screen.getByText("25 XLM")).toBeTruthy();
    expect(screen.getByText("Funds stay locked for 7 days.")).toBeTruthy();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const props = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Deposit" }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("calls onClose without confirming when cancelled", () => {
    const props = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("shows the estimated network fee in XLM", () => {
    renderModal({ fee: { minResourceFee: "12345" } });

    expect(screen.getByText("Estimated network fee")).toBeTruthy();
    expect(screen.getByText("~0.0012445 XLM")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Confirm Deposit" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("disables confirm while the fee is still being estimated", () => {
    const props = renderModal({ fee: { isLoading: true } });

    expect(screen.getByText("Estimating…")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm Deposit" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("marks the fee unavailable when simulation fails", () => {
    renderModal({ fee: { isError: true } });

    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.getByText(/couldn't estimate the network fee/i)).toBeTruthy();
  });

  it("labels sponsored fees", () => {
    renderModal({ fee: { minResourceFee: "12345", isSponsored: true } });

    expect(screen.getByText("~0.0012445 XLM (sponsored)")).toBeTruthy();
  });

  it("renders nothing when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
