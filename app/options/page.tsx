import NavbarTitle from "@/components/NavbarTitle";

type OptionsParamsType = { searchParams: Promise<{ redirect: string }> };

export default async function Options({ searchParams }: OptionsParamsType) {
  const { redirect } = await searchParams;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle redirect={redirect}>امکانات</NavbarTitle>
      </div>
    </div>
  );
}
