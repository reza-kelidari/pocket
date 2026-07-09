"use client";

import Capsule from "@/components/Capsule";
import AccountsListElement from "../../components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Left from "@/icons/Left";
import SwipeableAccountItem from "@/components/SwipableAccountElement";
import Right from "@/icons/Right";
import { accountsStore } from "@/utility/accounts/service/accountsStore";
import SortableAccountElement from "@/components/SortableAccountElement";
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function Accounts() {
  const { getAccounts } = useAccounts();
  const { getBalances } = useBalances();
  const router = useRouter();
  const [showHint, setShowHint] = useState(true);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const haveUserAccount =
    getAccounts().filter((item) => !item.default).length > 0;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace(`/splash?from=/accounts`);
    }
  }, [getAccounts, router]);

  useEffect(() => {
    if (openItemId === null) return;
    const handleCloseAll = () => setOpenItemId(null);
    const timer = setTimeout(() => {
      window.addEventListener("mouseup", handleCloseAll);
      window.addEventListener("touchend", handleCloseAll);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mouseup", handleCloseAll);
      window.removeEventListener("touchend", handleCloseAll);
    };
  }, [openItemId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const accounts = getAccounts();
    const oldIndex = accounts.findIndex((a) => a.id === active.id);
    const newIndex = accounts.findIndex((a) => a.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newAccounts = arrayMove(accounts, oldIndex, newIndex);
      await accountsStore.reorderAccounts(newAccounts);
    }
  };

  if (getAccounts().length === 0) return null;
  const accounts = getAccounts();

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها">
          <Capsule Icon={Left} href="/accounts/add">
            حساب جدید
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-5">
        <div
          className={`absolute top-16 z-20 right-1/2 translate-x-1/2 w-screen p-7.5 transition-all duration-700 ${showHint ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="flex items-center justify-end">
            {haveUserAccount && (
              <span className="text-[10px] text-secondary flex items-center gap-1 ml-auto">
                <Right className="fill-secondary" height={15} width={15} />
                برای حذف به راست بکشید
              </span>
            )}
            <span className="text-[10px] text-secondary flex items-center gap-1">
              برای ویرایش به چپ بکشید
              <Left className="fill-secondary" height={15} width={15} />
            </span>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={accounts.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {accounts.map((account) => (
              <SortableAccountElement key={account.id} account={account}>
                <SwipeableAccountItem
                  isOpen={openItemId === account.id}
                  onOpenChange={(open) =>
                    setOpenItemId(open ? account.id : null)
                  }
                  onCloseOthers={() => setOpenItemId(null)}
                  onEdit={() => router.push(`/accounts/edit?id=${account.id}`)}
                  onDelete={() =>
                    router.push(`/accounts/delete?id=${account.id}`)
                  }
                  defaultAccount={account.default}
                >
                  <AccountsListElement
                    account={account}
                    balances={getBalances()}
                    href={`accounts/details?id=${account.id}`}
                  />
                </SwipeableAccountItem>
              </SortableAccountElement>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
