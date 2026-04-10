// src/components/__mocks__/ionic.tsx
// Shared vi.mock factory — import in any test file:
// vi.mock('@ionic/react', () => ionicMock)

export const ionicMock = {
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children }: any) => <h1>{children}</h1>,
  IonContent: ({ children }: any) => <main>{children}</main>,
  IonList: ({ children }: any) => <ul>{children}</ul>,
  IonItem: ({ children, onClick }: any) => <li onClick={onClick}>{children}</li>,
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  IonButtons: ({ children }: any) => <div>{children}</div>,
  IonFab: ({ children }: any) => <div>{children}</div>,
  IonFabButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  IonIcon: () => <span />,
  IonModal: ({ isOpen, children }: any) => isOpen ? <div role="dialog">{children}</div> : null,
  IonInput: ({ value, onIonInput, placeholder }: any) => (
    <input
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  IonTextarea: ({ value, onIonInput, placeholder }: any) => (
    <textarea
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  IonSelect: ({ value, onIonChange, children }: any) => (
    <select value={value ?? ''} onChange={e => onIonChange?.({ detail: { value: e.target.value } })}>
      {children}
    </select>
  ),
  IonSelectOption: ({ value, children }: any) => <option value={value}>{children}</option>,
  IonCheckbox: ({ checked, onIonChange }: any) => (
    <input type="checkbox" checked={checked ?? false} onChange={e => onIonChange?.({ detail: { checked: e.target.checked } })} />
  ),
  IonSpinner: () => <span data-testid="spinner" />,
  IonBadge: ({ children }: any) => <span>{children}</span>,
  IonChip: ({ children }: any) => <span>{children}</span>,
  IonSearchbar: ({ value, onIonInput, placeholder }: any) => (
    <input
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  useIonAlert: () => [vi.fn()],
}
