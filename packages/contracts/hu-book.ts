export type HuBookEntry={id:number;nickname:string;tiles:{char:string;comma:boolean}[];finishedAt:number|null;practiceMode:boolean;deckSetName:string|null;likes:number};
export type HuBookPage={entries:HuBookEntry[];nextCursor:number|null;total:number;day:string;likedId:number|null;resetsAt:number;serverNow:number};
