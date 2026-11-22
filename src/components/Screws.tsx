// Four corner screws for a faceplate. Purely decorative.
const screw = "absolute size-[7px] rounded-full bg-screw shadow-[inset_0_1px_1px_rgb(0_0_0/0.4)]";

export function Screws() {
  return (
    <>
      <span aria-hidden="true" className={`${screw} top-[7px] left-[7px]`} />
      <span aria-hidden="true" className={`${screw} top-[7px] right-[7px]`} />
      <span aria-hidden="true" className={`${screw} bottom-[7px] left-[7px]`} />
      <span aria-hidden="true" className={`${screw} bottom-[7px] right-[7px]`} />
    </>
  );
}
