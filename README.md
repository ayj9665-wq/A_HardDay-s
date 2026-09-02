# A Hard Day's

할 일 카드와 아날로그 시계를 결합한 Tauri 데스크톱 애플리케이션입니다.

## 주요 기능

- 할 일이 없을 때 현재 시각을 보여주는 일반 아날로그 시계
- 할 일이 있을 때 활성 작업의 배치 시간을 가리키는 작업 시침
- 사용자가 선택하는 1~12시 작업 위치와 최대 6개 제한
- 작업 추가, 수정, 삭제, 완료, 활성화
- `tape_01.png`, `tape_02.png` 무작위 배정 및 영구 유지
- 로컬 데이터 저장
- 로컬 시간에 따른 Morning, Noon, Night 제목 변경

날씨, 위치 권한, 비 효과, 흐린 창문 및 표면 텍스처는 포함하지 않습니다.

## 사전 요구 사항

공통으로 필요한 것:

- Node.js 20.19 이상 (`.nvmrc`가 권장 버전을 지정합니다)
- Rust 툴체인 — [rustup](https://rustup.rs)으로 설치합니다. 데스크톱 실행에만 필요하며, 브라우저 미리보기와 테스트에는 필요하지 않습니다.

### Windows

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — "Desktop development with C++" 워크로드
- WebView2 런타임 — Windows 11에는 기본 탑재되어 있고, Windows 10에서는 [별도 설치](https://developer.microsoft.com/microsoft-edge/webview2/)가 필요할 수 있습니다.

### macOS

- Xcode Command Line Tools

  ```sh
  xcode-select --install
  ```

rustup 설치 직후에는 `cargo`가 PATH에 잡히지 않을 수 있습니다. 새 터미널을 열거나 셸 프로필을 다시 읽으세요.

## 프런트엔드 실행

```sh
npm install
npm run dev
```

브라우저에서 `http://localhost:1420`을 엽니다. 브라우저 미리보기에서는 데이터가 `localStorage`에 저장되고, 앱 추적과 창 제어 같은 데스크톱 전용 기능은 "미지원"으로 표시됩니다.

## 테스트와 빌드

```sh
npm test
npm run build
```

## 데스크톱 실행

```sh
npm run tauri dev
```

Tauri 앱에서는 데이터가 앱 전용 Store 파일에 저장됩니다.

릴리스 실행 파일만 생성하려면 다음 명령을 사용합니다.

```sh
npm run tauri build -- --no-bundle
```

설치 패키지까지 만들려면 `--no-bundle`을 빼고 실행합니다. **OS별 빌드는 반드시 해당 OS에서 수행해야 합니다** — Windows 설치 파일은 Windows에서, macOS `.app`/`.dmg`는 macOS에서만 만들 수 있습니다.
