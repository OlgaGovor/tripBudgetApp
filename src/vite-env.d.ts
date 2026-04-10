/// <reference types="vite/client" />

// Allow CSS side-effect imports from third-party packages (e.g. @ionic/react/css/*)
declare module '*.css' {
  const content: string
  export default content
}
