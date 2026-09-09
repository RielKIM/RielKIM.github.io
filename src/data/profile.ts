// 공개할 정보만 작성하세요. 이 저장소와 Git 이력은 공개됩니다.
export const profile = {
 name: 'YoungWook KIM', handle: 'RielKIM',
 title: '만들고, 배우고, 기록합니다.',
 description: '프로젝트와 기술에 대한 생각을 차곡차곡 쌓아가는 개인 아카이브.',
 github: 'https://github.com/RielKIM', linkedin: 'https://www.linkedin.com/in/epictem/',
 email: '', bio: '',
};
export interface Experience { period: string; company: string; role: string; description: string; }
export const experience: Experience[] = [];
