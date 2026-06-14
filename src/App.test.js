import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeContext';
import { CollectionProvider } from './context/CollectionContext/CollectionContext';
import { EnvironmentProvider } from './context/EnvironmentContext/EnvironmentContext';
import { saveCollections, saveEnvironments } from './storage/appStorage';
import {
  mockCollections,
  mockEnvironments,
  mockActiveRequest,
  cloneKeyValueRows,
} from './data/mockData';

function seedMockAppData() {
  saveEnvironments(
    mockEnvironments.map((env) => ({
      ...env,
      variables: env.variables.map((v) => ({ ...v })),
    }))
  );
  saveCollections(
    mockCollections.map((col) => ({
      ...col,
      requests: col.requests.map((req) => ({
        ...req,
        headers: cloneKeyValueRows(mockActiveRequest.headers),
        params: cloneKeyValueRows(mockActiveRequest.params),
        body: req.id === 'req-1' ? mockActiveRequest.body : '',
      })),
    }))
  );
}

function renderApp() {
  return render(
    <ThemeProvider>
      <CollectionProvider>
        <EnvironmentProvider>
          <App />
        </EnvironmentProvider>
      </CollectionProvider>
    </ThemeProvider>
  );
}

function openSidebar() {
  fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));
}

function selectCollectionByName(collectionName) {
  openSidebar();
  fireEvent.click(screen.getByText(collectionName));
}

function expandCollectionByName(collectionName) {
  openSidebar();
  const nameEl = screen.getByText(collectionName);
  const row = nameEl.closest('.mb-1');
  const expandBtn = within(row).getByRole('button', {
    name: /expand collection/i,
  });
  fireEvent.click(expandBtn);
}

function selectRequestByName(requestName, collectionName = 'User API') {
  expandCollectionByName(collectionName);
  fireEvent.click(screen.getByText(requestName));
}

beforeEach(() => {
  localStorage.clear();
});

test('renders Mini API shell with welcome state on first visit', () => {
  renderApp();
  expect(screen.getAllByText('Mini API').length).toBeGreaterThan(0);
  expect(
    screen.getByRole('heading', { name: /welcome to mini api/i })
  ).toBeInTheDocument();
  expect(
    screen.getByText(/organize requests in collections/i)
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /create your first collection/i })
  ).toBeInTheDocument();
});

test('shows select-from-sidebar hint when collections exist but none is selected', () => {
  seedMockAppData();
  renderApp();
  expect(
    screen.getByText(/select a collection or request/i)
  ).toBeInTheDocument();
});

test('renders theme toggle', () => {
  renderApp();
  expect(
    screen.getAllByRole('button', { name: /switch to (light|dark) theme/i }).length
  ).toBeGreaterThan(0);
});

test('renders open sidebar control', () => {
  renderApp();
  expect(
    screen.getByRole('button', { name: /open sidebar/i })
  ).toBeInTheDocument();
});

test('renders response panel resize handle when a request is selected', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  expect(
    screen.getByRole('separator', { name: /resize response panel/i })
  ).toBeInTheDocument();
});

test('renders sidebar resize handle on desktop layout', () => {
  renderApp();
  expect(
    screen.getByRole('separator', { name: /resize sidebar/i })
  ).toBeInTheDocument();
});

test('shows empty collections state on first visit', () => {
  renderApp();
  openSidebar();
  expect(screen.getByText(/no collections yet/i)).toBeInTheDocument();
});

test('renders add collection control', () => {
  renderApp();
  openSidebar();
  expect(
    screen.getByRole('button', { name: /\+ collection/i })
  ).toBeInTheDocument();
});

test('can add a new collection and open collection detail view', () => {
  renderApp();
  fireEvent.click(
    screen.getByRole('button', { name: /create your first collection/i })
  );
  expect(screen.getByRole('heading', { name: 'New Collection' })).toBeInTheDocument();
  expect(screen.getByText(/export as json/i)).toBeInTheDocument();
});

test('can add a new collection from sidebar control', () => {
  renderApp();
  openSidebar();
  fireEvent.click(screen.getByRole('button', { name: /\+ collection/i }));
  expect(screen.getByRole('heading', { name: 'New Collection' })).toBeInTheDocument();
  expect(screen.getByText(/export as json/i)).toBeInTheDocument();
});

test('open sidebar sets aria-expanded on menu button', () => {
  renderApp();
  const menuButton = screen.getByRole('button', { name: /open sidebar/i });
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(menuButton);
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /^close sidebar$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /dismiss sidebar/i })).toBeInTheDocument();
});

test('renders Environments sidebar tab', () => {
  renderApp();
  openSidebar();
  expect(screen.getByRole('tab', { name: /environments/i })).toBeInTheDocument();
});

test('shows empty environments state on first visit', () => {
  renderApp();
  openSidebar();
  fireEvent.click(screen.getByRole('tab', { name: /environments/i }));
  expect(screen.getByText(/no environments yet/i)).toBeInTheDocument();
});

test('can open Environments tab and see seeded environment', () => {
  seedMockAppData();
  renderApp();
  openSidebar();
  fireEvent.click(screen.getByRole('tab', { name: /environments/i }));
  expect(
    screen.getByRole('button', { name: /\+ environment/i })
  ).toBeInTheDocument();
  fireEvent.click(screen.getByText('Development'));
  expect(screen.getByText('Variables')).toBeInTheDocument();
  expect(screen.getByText(/— Development/)).toBeInTheDocument();
});

test('shows collection detail view when collection is selected', () => {
  seedMockAppData();
  renderApp();
  selectCollectionByName('User API');
  expect(screen.getByRole('heading', { name: 'User API' })).toBeInTheDocument();
  expect(screen.getByText(/default bearer token/i)).toBeInTheDocument();
  expect(
    screen.queryByRole('separator', { name: /resize response panel/i })
  ).not.toBeInTheDocument();
});

test('shows environment name in top bar when request uses attached env', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  const main = screen.getByRole('main');
  expect(within(main).getByText('Development')).toBeInTheDocument();
  expect(
    within(main).queryByText(/collection environment/i)
  ).not.toBeInTheDocument();
});

test('renders environment variables in URL as highlighted tokens', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  const urlField = screen.getByRole('textbox', { name: /request url/i });
  expect(urlField).toHaveValue('{{BASE_URL}}/users');
  expect(screen.getByText('{{BASE_URL}}')).toHaveClass('text-accent');
});

test('URL field is editable when a request is selected', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  const urlField = screen.getByRole('textbox', { name: /request url/i });
  fireEvent.change(urlField, {
    target: { value: 'https://example.com/new-path' },
  });
  expect(urlField).toHaveValue('https://example.com/new-path');
});

test('Send button is disabled when URL is empty on selected request', () => {
  renderApp();
  openSidebar();
  fireEvent.click(screen.getByRole('button', { name: /\+ collection/i }));
  fireEvent.click(screen.getByRole('button', { name: /\+ request/i }));
  expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled();
});

test('Send button is enabled with valid URL', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled();
});

test('can edit environment variables from top bar', () => {
  seedMockAppData();
  renderApp();
  selectRequestByName('List users');
  fireEvent.click(screen.getByRole('button', { name: /edit variables/i }));
  const envEditor = screen.getByLabelText('Development environment variables');
  expect(
    within(envEditor).getByRole('button', { name: /\+ add row/i })
  ).toBeInTheDocument();
  const baseUrlInput = within(envEditor).getByDisplayValue(
    'http://localhost:3000/api'
  );
  fireEvent.change(baseUrlInput, {
    target: { value: 'http://localhost:3000/api?v=1' },
  });
  expect(baseUrlInput).toHaveValue('http://localhost:3000/api?v=1');
});
