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

## 프런트엔드 실행

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://localhost:1420`을 엽니다. 브라우저 미리보기에서는 데이터가 `localStorage`에 저장됩니다.

## 테스트와 빌드

```powershell
npm.cmd test
npm.cmd run build
```

## 데스크톱 실행

Rust와 운영체제별 Tauri 사전 요구 사항을 설치한 뒤 실행합니다.

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
npm.cmd run tauri dev
```

Tauri 앱에서는 데이터가 앱 전용 Store 파일에 저장됩니다.

릴리스 실행 파일만 생성하려면 다음 명령을 사용합니다.

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
npm.cmd run tauri build -- --no-bundle
```
