# Personal Design Studio

CV·이력서, 발표자료, 보고서, 대시보드를 **내 컴퓨터에서** 만들고 수정하는 디자인 작업실입니다. 현재 버전은 **v0.2**입니다. 브라우저와 CLI가 같은 프로젝트 모델과 렌더러를 사용합니다.

## 시작하기

Node.js **20.16 이상**이 필요합니다.

```bash
npm ci
npm start
```

터미널에 표시되는 **http://127.0.0.1:4177/**을 엽니다. GitHub 저장소 주소는 편집 화면이 아닙니다. Windows에서 `Forbidden`이 보이면 저장소 루트에서 `npm start`를 실행했는지 확인하고, 위 주소를 그대로 여세요. Windows 경로 회귀 테스트를 유지합니다.

## 파일에서 시작하기

1. 왼쪽의 **파일을 놓거나 선택** 영역에 파일을 넣습니다. 여러 개를 한 번에 선택할 수 있습니다.
2. 각 파일의 처리 상태를 확인하고, 파일 이름을 눌러 추출 텍스트와 경고를 봅니다.
3. 필요한 부분을 수정하고 CV·슬라이드·보고서·대시보드 중 목적 유형을 선택합니다.
4. **새 프로젝트 만들기**를 누릅니다. 기존 프로젝트는 목록에 그대로 남습니다. 여러 파일을 한 프로젝트의 출처로 모으려면 **현재 프로젝트에 출처만 첨부**를 사용합니다.
5. 오른쪽 **내용** 탭에서 항목을 수정하고 왼쪽에서 디자인을 고른 뒤 중앙 결과를 확인합니다.

| 형식 | 현재 가져오기 범위 |
|---|---|
| JSON | 기존 v0.1 프로젝트를 v2 모델로 읽고 **사본** 생성 |
| TXT·MD | 텍스트; Markdown 제목·목록·간단한 표 행 구분 |
| DOCX | 문단·제목·목록·표의 텍스트 추출. 원본 레이아웃은 복원하지 않음 |
| PDF | 페이지별 선택 가능한 텍스트 추출. 이미지 스캔 PDF에는 별도 OCR 필요 |
| PPTX | 슬라이드별 텍스트·노트와 이미지 파일 목록 확인. 원본 슬라이드의 배치와 애니메이션은 복원하지 않음 |
| PNG·JPG | 로컬 참조 이미지로 첨부. OCR은 제공하지 않음 |
| SVG | 파일 이름·형식만 참조; 보안상 실행하거나 화면에 삽입하지 않음 |

일반 파일은 **12 MiB**, 프로젝트 JSON에 포함되는 이미지 참조는 **3 MiB**까지 허용합니다. HWPX는 지원 가능성을 검토 중이며 현재 가져오지 않습니다. 바이너리 HWP는 지원하지 않습니다. 파일은 외부 AI API나 GitHub에 자동 업로드되지 않습니다. 원본 문서 파일 자체는 프로젝트 JSON에 저장되지 않으므로 별도 보관하세요. JSON에는 추출 텍스트와 출처가 포함될 수 있으니 공유 전에 확인하세요.

## 편집과 디자인

**내용** 탭에서 경력·프로젝트·학력·기술, 슬라이드, 보고서 섹션, 대시보드 지표를 추가·삭제·이동할 수 있습니다. JSON을 직접 편집할 필요는 없습니다. **디자인** 탭에서 색상 테마, 글꼴 조합, 본문·제목 크기, 줄간격, 자간, 문단 간격, 여백, 컬럼 간격을 조절합니다. 글꼴 조합 12종은 Noto Sans KR, Noto Serif KR, Inter, Source Serif 4, IBM Plex Mono의 자체 호스팅 자산으로 구성됩니다. 출력 HTML에는 사용된 글꼴 파일과 OFL 라이선스 고지가 포함됩니다. 오프라인에서도 글꼴을 다시 내려받지 않습니다.

현재 갤러리에는 기존 4개 테마가 있습니다. **24개 구조적으로 다른 프리셋은 아직 제공하지 않습니다.** 긴 문서의 페이지 나눔과 다양한 화면 크기의 넘침은 PDF 인쇄 전에 직접 확인해야 합니다.

프로젝트는 이 브라우저의 로컬 저장소에 자동 저장되고 되돌리기·다시 하기를 사용할 수 있습니다. 브라우저 저장 공간이 부족하면 오류를 보여주며, **JSON 저장**을 사용해 작업을 보관하세요. 브라우저 저장소는 백업이 아닙니다. 가져온 내용은 검토 전 상태와 출처가 프로젝트 JSON에 표시됩니다. 예시의 성과·수치는 실제 사용자 정보가 아닙니다.

## 내보내기

- **프로젝트 JSON:** 브라우저와 CLI가 함께 읽는 편집 가능 형식.
- **HTML:** 글꼴이 포함된 독립 실행 파일. 실제 텍스트를 선택할 수 있습니다.
- **PDF:** 브라우저의 **PDF 인쇄** 또는 로컬 Chrome/Chromium을 사용하는 CLI의 `pdf` 명령. 인쇄 페이지 수와 잘림을 확인하세요.

편집 가능한 DOCX·PPTX 출력은 아직 지원하지 않습니다. 이미지만 들어 있는 PPTX를 편집형이라고 표시하지 않습니다.

## CLI와 AI 에이전트

```bash
node bin/studio.mjs import ./my-cv.docx --type cv -o ./my-cv.studio.json
node bin/studio.mjs import ./talk.pdf --type slides -o ./talk.studio.json
node bin/studio.mjs fonts list
node bin/studio.mjs init cv -o ./draft.json
node bin/studio.mjs audit ./draft.json
node bin/studio.mjs build ./draft.json -o ./draft.html
node bin/studio.mjs pdf ./draft.json -o ./draft.pdf
node bin/studio.mjs screenshot ./draft.json -o ./draft.png
node bin/studio.mjs doctor
```

`init`, `audit`, `build`, `pdf`, `screenshot`, `doctor`의 기존 사용법을 유지합니다. PDF·스크린샷 CLI에는 로컬 Chrome/Chromium이 필요합니다. `import`는 원본을 바꾸지 않고 새 JSON 파일을 씁니다. 출력 경로에 이미 파일이 있으면 덮어쓸 수 있으므로 다른 파일 이름을 지정하세요.

이 저장소에서 Codex는 `AGENTS.md`와 `.agents/skills/personal-design-studio/SKILL.md`, Claude Code는 `CLAUDE.md`와 `.claude/skills/personal-design-studio/SKILL.md`를 통해 동일한 `skills/personal-design-studio/SKILL.md`로 연결됩니다. 관련 요청에 자동 선택될 수 있지만 보장되지는 않습니다. Codex에서는 `$personal-design-studio`, Claude Code에서는 `/personal-design-studio`로 명시적으로 호출할 수 있습니다.

다른 저장소에서도 개인 스킬을 쓰려면 자신의 컴퓨터에서 먼저 `npm run install:agents -- --dry-run`으로 경로를 확인하고 `npm run install:agents`를 실행하세요. 기존 설치를 덮어쓰려면 `--force`가 필요합니다. 개인 문서·비공개 연구·회사 자료는 이 공개 저장소에 커밋하지 마세요.

개발 구조와 한계는 [개발자 안내](docs/DEVELOPMENT.md), 선택형 [외부 연동](docs/INTEGRATIONS.md), [저장소 경계](docs/REPOSITORY_BOUNDARY.md)를 참고하세요.

## 라이선스

스튜디오 코드는 MIT입니다. 포함된 글꼴은 각 Fontsource 패키지의 SIL OFL 1.1을 따르며, 독립 HTML에는 해당 라이선스 문구가 포함됩니다. 사용자 문서의 권리는 사용자에게 남습니다.
