# Day 2 UI Design

## Design Direction

The application is a focused utility for turning text into audio. The interface should feel calm, readable, and task-oriented: one primary workspace, clear controls, visible progress, and an audio result that appears only after generation succeeds.

## Page Structure

### Header

- Product name: Text to Speech
- Short status indicator for backend availability when that check is implemented
- No navigation is required for the Level 1 checkpoint

### Main Workspace

1. Text editor
   - Labelled multiline input
   - Character count and word count
   - Maximum length indicator
   - Clear action
2. Speech settings
   - Language select
   - Voice select filtered by language
   - Generate Speech primary action
3. Generated audio
   - Hidden before a successful generation
   - Native audio controls for play, pause, seeking, and volume
   - Download action
4. Feedback region
   - Loading state during generation
   - Validation messages near the relevant control
   - Service and network errors in a persistent alert region

## Interaction States

| State | UI behavior |
| --- | --- |
| Empty | Text area is focused or ready; generation is disabled until text is entered |
| Editing | Counts update immediately; length warning appears before the limit is exceeded |
| Invalid | Invalid fields show an accessible error and generation remains blocked |
| Ready | Language and voice are selected; generation is available |
| Generating | Button shows progress and prevents duplicate requests |
| Success | Audio player and download action become visible; old errors clear |
| Failure | Audio result remains hidden or unchanged; actionable error is shown |

## Responsive Layout

- Mobile: one column, full-width controls, and a compact header.
- Tablet: one column with wider text area and grouped settings.
- Desktop: constrained reading width with the text editor as the visual anchor and settings aligned beneath it.
- The layout must not depend on fixed viewport heights; long text and validation messages must remain readable without overlap.

## Component Boundaries

- `AppShell`: page frame and global feedback region.
- `TextInput`: text value, counts, limit, and clear behavior.
- `LanguageSelector`: supported language selection.
- `VoiceSelector`: voices compatible with the selected language.
- `GenerateButton`: request initiation and loading state.
- `AudioPlayer`: generated audio controls and download action.
- `ErrorMessage`: validation, network, and service errors.

## Accessibility Requirements

- Every form control has a visible label and a stable accessible name.
- Error text is connected to the invalid control and announced through an alert or live region when appropriate.
- Keyboard focus remains visible and follows the user's action.
- Color is never the only way to communicate validation or status.
- Audio controls use the browser's native semantics unless a custom control is required later.

## Visual Tokens

- Background: warm neutral, high contrast with the workspace.
- Surface: white or near-white with a subtle border.
- Text: near-black for primary content and muted gray for supporting metadata.
- Accent: one high-contrast action color used for the primary generation button and focus states.
- Spacing: consistent 8px-based scale.
- Borders: restrained, with a maximum radius of 8px.

## Day 2 Acceptance Criteria

- The main user journey is defined from text entry through audio download.
- Empty, invalid, loading, success, and failure states are specified.
- Component responsibilities are clear enough to implement independently.
- The layout behavior is defined for mobile, tablet, and desktop widths.
- Accessibility requirements are included before the React implementation begins.

