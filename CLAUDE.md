# CLAUDE.md: BYUN LAB 홈페이지 (GitHub Pages)

## 1. 프로젝트 개요

- 목적: 기존 Google Sites 연구실 홈페이지(https://sites.google.com/view/byunlab/home)를 GitHub Pages 기반 정적 사이트로 이전
- 핵심 기능: 논문 목록을 OpenAlex API에서 주기적으로 자동 수집하여 Publications 페이지에 반영
- 연구실: 변지혜 박사 연구팀, KIST 물자원순환연구센터
- 연구 키워드: Environment (수처리, 오염 제거), Energy (광촉매, H2O2 생산, CO2 전환), Materials (다공성/공액 고분자)

## 2. 기술 스택 및 원칙

- 정적 HTML + CSS + vanilla JavaScript. 프레임워크, 번들러, 빌드 단계 없음
- 데이터 수집: Python 3 스크립트 (표준 라이브러리 + `requests`만 사용)
- 자동화: GitHub Actions (cron)
- 호스팅: GitHub Pages (`main` 브랜치 루트 배포)
- 외부 의존성 최소화. CDN 라이브러리 사용하지 않음
- 모든 페이지 반응형 (모바일 우선)

## 3. 저장소 구조

```
/
├── index.html              # Home
├── team.html               # The Team
├── research.html           # Research
├── publications.html       # Publications
├── news.html               # News
├── assets/
│   ├── css/style.css
│   ├── js/main.js          # 공통 (내비게이션, hero 그래픽)
│   ├── js/publications.js  # publications.json 렌더링
│   └── img/                # 팀 사진 등
├── data/
│   ├── publications.json   # 자동 생성. 수동 편집 금지
│   ├── config.json         # OpenAlex 저자 ID, 이름 표기, 제외 DOI
│   ├── manual_pubs.json    # OpenAlex에 없는 항목만 수동 추가 (선택)
│   ├── covers.json         # Home 저널 표지 회전목마 (이미지는 assets/img/covers/*.webp, 폭 400px)
│   └── last_checked.txt    # 워크플로 월 1회 확인 날짜 (60일 비활성화 방지)
├── scripts/
│   └── fetch_pubs.py
└── .github/workflows/
    └── update-pubs.yml
```

## 4. 페이지 구성

Home, The Team, Research, Publications, News 5개. Lab tour 페이지는 만들지 않음.

| 페이지 | 내용 |
|---|---|
| Home | Hero, 연구실 소개 문장과 저널 표지 회전목마, 연구 분야 요약 3개, 최근 논문 5편, 최근 뉴스 3건, 연락처 및 지도 링크 |
| The Team | PI 소개, 구성원(연구원, 학생), 졸업생. 기존 사이트 내용 이전 |
| Research | 연구 주제 소개. 기존 사이트 내용 이전 |
| Publications | 자동 수집 논문 목록 (연도별 그룹) + Google Scholar 프로필 링크 |
| News | 기존 사이트 내용 이전. 날짜 역순 |

공통: 상단 고정 내비게이션, 하단 footer (주소, 이메일, 전화, Google Scholar, X(@JeehyeB) 링크, 학생 모집 안내)

연락처:
- L4112, Water Cycle Research Center, Korea Institute of Science and Technology
- Hwarangno 14-gil 5, Seongbuk-gu, Seoul, 02792, Korea
- Office: +82-2-958-5880, Email: jbyun [at] kist.re.kr (사이트에서는 JS로 조합해 표시, 아래 10장 참고)
- Google Scholar: https://scholar.google.com/citations?user=GMXEnowAAAAJ

## 5. 디자인 사양

### 방향
대비 톤. 어두운 hero(빛과 물 그라데이션) + 밝은 본문. 환경, 에너지, 소재 세 키워드가 hero에서 드러나야 함.

### 색상 토큰 (`:root` CSS 변수로 정의)

| 변수 | 값 | 용도 |
|---|---|---|
| `--navy` | `#0B1F33` | hero 배경, footer 배경 |
| `--teal` | `#1BA3A6` | 물/환경. 링크, 강조 |
| `--amber` | `#F2A541` | 빛/에너지. 포인트 강조 (제한적으로) |
| `--graphite` | `#1F2933` | 본문 텍스트 |
| `--muted` | `#6B7280` | 보조 텍스트 (저널명, 날짜) |
| `--line` | `#E5E7EB` | 구분선 |
| `--bg` | `#FFFFFF` | 본문 배경 |

### Hero
- 배경: `--navy` 위에 teal(좌하단)과 amber(우상단) radial-gradient를 낮은 불투명도로 겹침
- 그래픽: 고분자 네트워크를 연상시키는 노드와 연결선. `<canvas>` 또는 인라인 SVG로 구현, 노드는 천천히 움직이고 가까운 노드끼리 선으로 연결
- `prefers-reduced-motion: reduce`일 때 애니메이션 정지
- 텍스트: 연구실 이름 "THE BYUN LAB", 한 줄 소개 (We design and make novel polymeric materials to find sustainable solutions for tackling the urgent problems of water pollution and energy shortage.), 키워드 3개(Environment · Energy · Materials)
- 높이: 데스크톱 약 52vh(최대 540px), 모바일 약 48vh. Home에만 전체 hero, 나머지 페이지는 낮은 높이의 동일 스타일 헤더

### 본문
- 폰트: Arial, Helvetica, sans-serif (전 페이지)
- 흰 배경, 최대 폭 약 960px 중앙 정렬
- 색상은 링크, 섹션 구분선, 소제목 강조에만 제한적으로 사용
- 카드형 요소는 얇은 테두리(`--line`)와 약한 그림자만 사용

## 6. 논문 자동 수집 (scripts/fetch_pubs.py)

### 데이터 소스
- OpenAlex API: https://api.openalex.org
- 요청 시 `mailto` 파라미터 포함 (polite pool). 값은 코드에 두지 않고 로컬은 `.env`, GitHub Actions는 Secret `OPENALEX_MAILTO`에서 읽음
- 구현 전 OpenAlex 공식 문서에서 현재 인증 방식(API key 필요 여부)을 확인할 것. 필요하면 GitHub Secret `OPENALEX_API_KEY`로 주입

### config.json 예시
```json
{
  "openalex_author_ids": ["A0000000000"],
  "highlight_names": ["J. Byun", "Jeehye Byun", "Byun J", "Ji-Hye Byun"],
  "exclude_dois": [],
  "min_year": 2012
}
```
- OpenAlex는 한 사람을 여러 저자 ID로 분리하는 경우가 있으므로 ID를 배열로 관리
- `covers`: 저널 표지를 원 논문에 붙이는 목록. `{"parent_doi", "doi" 또는 "url", "label"}`. `label`은 저널 페이지 표기 그대로 (Front Cover, Inside Front Cover, Cover Picture, Cover Feature 등). 표지 DOI는 별도 논문 항목에서 제거됨
- `covers`에 없는 표지(제목이 Front Cover:, Cover Feature:, Innentitelbild 등으로 시작)는 자동 제외되고 경고 로그를 남김. 필요하면 `covers`에 추가

### 수집 로직
1. `openalex_author_ids`의 각 ID에 대해 `/works?filter=author.id:{id}&per-page=200&cursor=*`로 전체 페이지 순회
2. DOI 기준 중복 제거 (DOI 없으면 소문자 정규화한 제목 기준)
3. `exclude_dois` 항목 제거, `type`이 paratext, erratum 등인 항목 제거, DOI 없는 OpenAlex 항목 제거
4. `manual_pubs.json` 항목 병합 (같은 DOI 또는 제목이면 수동 항목 우선). 수동 항목은 DOI 대신 `url` 필드로 링크 지정 가능 (예: KCI 페이지)
5. 필드 추출:
   - `title`: `display_name`
   - `authors`: `authorships[].author.display_name` 순서 유지. 표시 형식은 이니셜 + 성 (예: Jeehye Byun → J. Byun). 교신저자 표기(*)는 하지 않음
   - `journal`: `primary_location.source.display_name`
   - `volume`, `issue`, `pages`: `biblio`에서 추출. 없으면 생략
   - `year`, `date`: `publication_year`, `publication_date`
   - `doi`: `https://doi.org/...` 형태
6. `date` 내림차순 정렬 후 `data/publications.json`에 저장 (UTF-8, indent 2)
7. 기존 파일과 내용이 같으면 파일을 다시 쓰지 않음 (불필요한 커밋 방지)
8. 수집 실패(네트워크 오류, 응답 0건) 시 기존 파일을 유지하고 non-zero exit

### publications.json 스키마
```json
{
  "updated": "2026-09-28",
  "count": 49,
  "items": [
    {
      "title": "...",
      "authors": ["S. Kumar", "B. Bayarkhuu", "J. Byun"],
      "journal": "Chemistry - A European Journal",
      "volume": "31",
      "issue": null,
      "pages": "e202500967",
      "year": 2025,
      "date": "2025-05-20",
      "doi": "https://doi.org/10.1002/chem.202500967",
      "url": null,
      "covers": [
        {"label": "Front Cover", "doi": "https://doi.org/10.1002/chem.202583901", "url": null}
      ]
    }
  ]
}
```

## 7. Publications 페이지 렌더링 (assets/js/publications.js)

- `data/publications.json`을 fetch하여 연도별 그룹으로 렌더링 (최신 연도 먼저)
- 번호: 전체 개수에서 역순 번호 (최신 논문이 가장 큰 번호)
- 한 항목 형식:
  `번호. 저자 목록, 제목(DOI 링크, 없으면 url 링크, 둘 다 없으면 링크 없음. 새 탭), 저널명(이탤릭) 권, 페이지 (연도).`
- 화면 배치: 저자 / 제목(굵게) / 저널 권, 페이지 (연도) 세 줄로 나누되 순서는 위 형식 유지. 연도 라벨은 왼쪽 고정, 상단에 통계(편수, 표지 수, 기간)와 연도 바로가기
- `covers`가 있으면 항목 아래에 표지 링크 표시 (예: "Front Cover", 새 탭, DOI 우선 없으면 url)
- `highlight_names`에 해당하는 저자는 `<strong>`으로 표시. 매칭은 공백, 마침표, 하이픈을 무시한 비교로 처리
- TOC 이미지 사용하지 않음
- 태그, 필터 기능 없음
- 페이지 상단에 "Last updated: {updated}" 및 Google Scholar 전체 목록 링크 표시
- Home의 최근 논문 5편도 같은 JSON에서 렌더링

## 8. GitHub Actions (.github/workflows/update-pubs.yml)

- 트리거: 매주 월요일 00:00 UTC (`cron: "0 0 * * 1"`) + `workflow_dispatch` (수동 실행)
- runner: `ubuntu-24.04` 고정 (ubuntu-latest 변경 영향 방지)
- 단계: checkout → Python 설정 → `pip install requests` → `python scripts/fetch_pubs.py` → 월 1회 keepalive 기록 → 변경 있으면 커밋 및 push
- keepalive: GitHub는 저장소 활동이 60일 없으면 schedule 워크플로를 비활성화함. `data/last_checked.txt`의 연월이 현재와 다르면 날짜를 기록해 월 최대 1회 커밋 (`chore: update last checked date (YYYY-MM-DD)`)
- 커밋 메시지: `chore: update publications (YYYY-MM-DD)`
- 권한: `contents: write`
- 기본은 main 직접 반영. 원치 않는 항목이 들어오면 `config.json`의 `exclude_dois`에 추가하여 제외

## 9. 작업 순서

1. **저장소 골격**: 3장 구조대로 디렉터리와 빈 파일 생성
2. **OpenAlex 저자 ID 확정**:
   - `/authors?search=Jeehye Byun` 등으로 후보 조회, 소속(KIST, KAIST, MPI Polymer Research 이력)으로 판별
   - 후보 ID 목록과 각 ID의 논문 수를 사용자에게 보여주고 확인받은 뒤 `config.json`에 기록
3. **대조 검증**: `fetch_pubs.py` 1차 실행 결과를 기존 Publications 페이지(https://sites.google.com/view/byunlab/publications, 1~49번)와 대조
   - 누락 논문, 동명이인 등 잘못 포함된 논문, DOI 없는 항목을 표로 정리하여 사용자에게 보고
   - 사용자 확인 후 `exclude_dois`, `manual_pubs.json` 반영
4. **기존 콘텐츠 이전**: The Team, Research, News 페이지 내용을 기존 사이트에서 가져와 정리. 이미지가 필요하면 목록을 먼저 보고하고 사용자 확인 후 저장
5. **디자인 구현**: `style.css`, hero 그래픽, 5개 페이지 마크업
6. **Publications 렌더링** 구현
7. **GitHub Actions** 작성 및 `workflow_dispatch`로 1회 테스트
8. **GitHub Pages 배포** 설정 안내 (Settings > Pages > main / root)

각 단계 완료 시 결과를 요약 보고하고, 다음 단계 진행 전 사용자 확인을 받을 것.

## 10. 작업 규칙

- 사용자 확인 없이 파일을 대량 생성하거나 외부 이미지를 다운로드하지 않음
- 응답과 사이트 문구에 em-dash(—)를 사용하지 않음
- 기존 사이트의 문구는 의미를 유지하되, 사이트 구조에 맞게 정리 가능
- 코드 주석은 영어, 사용자 보고는 한국어
- 스팸 방지: 이메일 주소를 HTML과 저장소에 평문으로 남기지 않음. 사이트에서는 `<span class="js-email"></span><noscript>jbyun [at] kist.re.kr</noscript>`를 쓰고 `main.js`의 `renderEmails()`가 mailto 링크로 바꿈

## 11. 완료 기준

- 5개 페이지가 데스크톱/모바일에서 정상 표시되고 가로 스크롤이 없음
- Publications 목록이 기존 49편과 대조 검증을 거쳤고, 본인 이름이 굵게 표시되며 DOI 또는 URL이 있는 항목은 제목에 링크됨
- GitHub Actions 수동 실행 시 수집 → 변경 감지 → 커밋이 정상 동작
- 수집 실패 시 기존 데이터가 유지됨
