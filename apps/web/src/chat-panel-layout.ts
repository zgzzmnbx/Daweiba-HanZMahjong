/** Coordinates are CSS pixels in the layout viewport; the returned top is shell-relative. */
export function chatPanelFrame({shellTop,shellBottom,visibleTop,visibleHeight,anchorBottom,maxHeight}:{shellTop:number;shellBottom:number;visibleTop:number;visibleHeight:number;anchorBottom:number;maxHeight:number}){
 const topEdge=Math.max(shellTop,visibleTop),bottomEdge=Math.max(topEdge,Math.min(shellBottom,visibleTop+visibleHeight));
 const inset=Math.min(8,(bottomEdge-topEdge)/4),minTop=topEdge-shellTop+inset,bottom=bottomEdge-shellTop-inset;
 // Keep the usual position below chat bubbles when it fits; otherwise give the composer priority.
 const top=Math.max(minTop,Math.min(anchorBottom-shellTop+6,bottom-220));
 return {top,height:Math.max(0,Math.min(maxHeight,bottom-top))};
}
