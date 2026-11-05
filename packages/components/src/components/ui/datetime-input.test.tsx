import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { DateTimeInput } from "./datetime-input";
import { DateTimePicker } from "./datetime-picker";

afterEach(cleanup);

function EntryDateField({
  creationDate,
  loading,
  onChange,
}: {
  creationDate: Date;
  loading: boolean;
  onChange: (date: Date | undefined) => void;
}) {
  const form = useForm({
    values: { creationDate },
    resetOptions: { keepDirtyValues: true },
  });
  return (
    <FormProvider {...form}>
      {loading ? null : (
        <Controller
          control={form.control}
          name="creationDate"
          render={({ field }) => (
            <DateTimePicker
              value={field.value}
              onChange={(date) => {
                onChange(date);
                field.onChange(date);
              }}
              renderTrigger={({ open, value, setOpen }) => (
                <DateTimeInput
                  value={value}
                  onChange={(date) => {
                    if (!open) {
                      onChange(date);
                      field.onChange(date);
                    }
                  }}
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                />
              )}
            />
          )}
        />
      )}
    </FormProvider>
  );
}

describe("DateTimeInput", () => {
  it("does not publish the initial value as a user edit", () => {
    const onChange = vi.fn();
    render(
      <DateTimeInput
        value={new Date("2020-04-05T06:07:08.123Z")}
        timezone="UTC"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts loaded or reset values without writing stale segments back", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimeInput
        value={new Date("2026-11-05T15:00:00Z")}
        timezone="UTC"
        onChange={onChange}
      />,
    );

    rerender(
      <DateTimeInput
        value={new Date("2020-04-05T06:07:08.123Z")}
        timezone="UTC"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("publishes a valid keyboard edit", () => {
    const onChange = vi.fn();
    render(
      <DateTimeInput
        value={new Date("2020-04-05T06:07:08Z")}
        timezone="UTC"
        onChange={onChange}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.click(input, { target: { selectionStart: 17 } });
    fireEvent.keyDown(input, { key: "9" });

    expect(input).toHaveValue("2020-04-05 06:07:09");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Date("2020-04-05T06:07:09Z"),
    );
  });

  it("keeps incomplete edits local until the date is valid", () => {
    const onChange = vi.fn();
    render(
      <DateTimeInput
        value={new Date("2020-04-05T06:07:08Z")}
        timezone="UTC"
        onChange={onChange}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.click(input, { target: { selectionStart: 0 } });
    fireEvent.keyDown(input, { key: "Backspace" });
    fireEvent.keyDown(input, { key: "2" });

    expect(onChange).not.toHaveBeenCalled();

    for (const key of ["0", "2", "1"]) {
      fireEvent.keyDown(input, { key });
    }
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Date("2021-04-05T06:07:08Z"),
    );
  });

  it("does not overwrite a loaded entry date with the temporary current time", () => {
    const onChange = vi.fn();
    const currentDate = new Date("2026-11-05T15:00:00.456");
    const originalDate = new Date("2020-04-05T06:07:08.123");
    const { rerender } = render(
      <EntryDateField creationDate={currentDate} loading onChange={onChange} />,
    );

    rerender(
      <EntryDateField
        creationDate={originalDate}
        loading={false}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <EntryDateField
        creationDate={new Date(originalDate)}
        loading={false}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
    expect(onChange).not.toHaveBeenCalled();

    const input = screen.getByRole("textbox");
    fireEvent.click(input, { target: { selectionStart: 17 } });
    fireEvent.keyDown(input, { key: "9" });
    expect(input).toHaveValue("2020-04-05 06:07:09");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Date("2020-04-05T06:07:09"),
    );
  });

  it("updates the display format without changing the timestamp", () => {
    const onChange = vi.fn();
    const value = new Date("2020-04-05T06:07:08Z");
    const { rerender } = render(
      <DateTimeInput value={value} timezone="UTC" onChange={onChange} />,
    );

    rerender(
      <DateTimeInput
        value={value}
        timezone="UTC"
        format="yyyy-MM-dd"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("publishes a meridiem edit in a 12-hour format", () => {
    const onChange = vi.fn();
    render(
      <DateTimeInput
        value={new Date("2020-04-05T06:07:08Z")}
        timezone="UTC"
        format="yyyy-MM-dd hh:mm:ss a"
        onChange={onChange}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.click(input, { target: { selectionStart: 20 } });
    fireEvent.keyDown(input, { key: "p" });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Date("2020-04-05T18:07:08Z"),
    );
  });

  it("does not emit calendar previews or cancellation, but still submits Done", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const creationDate = new Date("2020-04-05T06:07:08.123");
    render(
      <EntryDateField
        creationDate={creationDate}
        loading={false}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(creationDate);
    expect(screen.getByRole("textbox")).toHaveValue("2020-04-05 06:07:08");
  });
});
