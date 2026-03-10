import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { PageDataContext, Pages } from "@keybr/pages-shared";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { isNotNull, isNull } from "rich-assert";
import { Template } from "./Template.tsx";

test("render", () => {
  const r = render(
    <PageDataContext.Provider
      value={{
        base: "https://www.keybr.com/",
        locale: "en",
        user: null,
        publicUser: {
          id: null,
          name: "name",
          imageUrl: null,
        },
        settings: null,
      }}
    >
      <FakeIntlProvider>
        <MemoryRouter>
          <Template path="/page">
            <div>hello</div>
          </Template>
        </MemoryRouter>
      </FakeIntlProvider>
    </PageDataContext.Provider>,
  );

  isNotNull(r.queryByText("hello"));
  isNotNull(r.container.querySelector("#keybr_728x90_970x90_ATF"));
  isNotNull(r.container.querySelector("#keybr_160x600_Left"));

  r.unmount();
});

test("render alt", () => {
  const r = render(
    <PageDataContext.Provider
      value={{
        base: "https://www.keybr.com/",
        locale: "en",
        user: null,
        publicUser: {
          id: "abc",
          name: "name",
          imageUrl: null,
          premium: true,
        },
        settings: null,
      }}
    >
      <FakeIntlProvider>
        <MemoryRouter>
          <Template path="/page">
            <div>hello</div>
          </Template>
        </MemoryRouter>
      </FakeIntlProvider>
    </PageDataContext.Provider>,
  );

  isNotNull(r.queryByText("hello"));

  r.unmount();
});

test("render practice page without ads", () => {
  const r = render(
    <PageDataContext.Provider
      value={{
        base: "https://www.keybr.com/",
        locale: "en",
        user: null,
        publicUser: {
          id: null,
          name: "name",
          imageUrl: null,
        },
        settings: null,
      }}
    >
      <FakeIntlProvider>
        <MemoryRouter>
          <Template path={Pages.practice.path}>
            <div>hello</div>
          </Template>
        </MemoryRouter>
      </FakeIntlProvider>
    </PageDataContext.Provider>,
  );

  isNotNull(r.queryByText("hello"));
  isNull(r.container.querySelector("#keybr_728x90_970x90_ATF"));
  isNull(r.container.querySelector("#keybr_160x600_Left"));

  r.unmount();
});
