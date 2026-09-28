# THE BYUN LAB 홈페이지

KIST 물자원순환연구센터 변지혜 박사 연구팀 홈페이지 (GitHub Pages 정적 사이트).

- 사이트: https://07jhbyun.github.io/byunlab/
- 콘텐츠 편집(CMS): https://07jhbyun.github.io/byunlab/admin/ (사이트 메뉴에는 링크 없음)

## 1. CMS로 수정하기 (Sveltia CMS)

Team, News, Research 대표 논문, 저널 표지는 브라우저에서 수정합니다.

1. `/admin/`에 접속해 **Sign In with Token**을 누릅니다.
2. GitHub fine-grained 토큰(이 저장소만, Contents: Read and write)을 붙여 넣습니다.
3. **Site content**에서 Team / News / Research / Journal covers를 골라 수정하고 **Save**를 누릅니다.
4. 저장하면 `main`에 바로 커밋되고, 1~2분 뒤 사이트에 반영됩니다.

참고
- Team: 구성원과 졸업생은 한 목록입니다. **Status**를 `alumni`로 바꾸면 졸업생 영역으로 옮겨집니다. 목록 순서가 화면 순서입니다.
- News: 날짜는 달력에서 고릅니다. 화면에는 날짜 최신순으로 자동 정렬됩니다.
- 글 안의 링크: `[표시할 글자](https://주소)`
- 올린 이미지는 WebP로 변환되고(긴 변 최대 1000px, 파일당 5MB 제한) `assets/img/team/`, `assets/img/news/`, `assets/img/covers/`에 저장됩니다.
- Research: DOI만 입력합니다. Publications 목록에 있는 논문만 표시됩니다.

## 2. GitHub 웹에서 직접 수정하기

github.com에서 파일(예: `data/news.json`)을 열고 연필 아이콘을 눌러 수정한 뒤 **Commit changes**로 `main`에 저장합니다.
JSON 형식(쉼표, 따옴표, 괄호)이 깨지면 해당 영역이 사이트에서 사라지니 주의하세요.

## 3. 논문 목록 자동 수집

- `scripts/fetch_pubs.py`가 `data/config.json`의 OpenAlex 저자 ID로 논문을 모아 `data/publications.json`을 만듭니다. 이 파일은 직접 수정하지 않습니다.
- GitHub Actions(`.github/workflows/update-pubs.yml`)가 매주 월요일 00:00 UTC와 수동 실행(Actions > Update publications > Run workflow) 때 동작합니다. 목록이 바뀐 경우에만 커밋하고, 60일 비활성화를 막기 위해 한 달에 한 번 `data/last_checked.txt`를 기록합니다.
- 잘못 들어온 논문은 `data/config.json`의 `exclude_dois`에 DOI를 추가해 뺍니다. OpenAlex에 없는 논문은 `data/manual_pubs.json`에 추가합니다.
- 논문 표지 링크는 `data/config.json`의 `covers`에서 관리합니다.
- 워크플로가 쓰는 Secret: `OPENALEX_API_KEY`, `OPENALEX_MAILTO`

## 4. 로컬에서 작업하기

**작업 전에 항상 `git pull`을 먼저 실행하세요.** CMS와 주간 워크플로가 `main`에 커밋하기 때문에 로컬 사본은 자주 뒤처져 있습니다.

```
git pull
python -m http.server 8000     # 브라우저에서 http://localhost:8000/
```

페이지가 `fetch`로 데이터를 불러오므로 파일을 더블클릭하지 말고 로컬 서버로 여세요.
로컬에서 논문 수집을 돌리려면 `.env`(git 제외)에 `OPENALEX_API_KEY`, `OPENALEX_MAILTO`를 넣습니다.
