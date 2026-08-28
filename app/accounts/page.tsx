"use client";

import Capsule from "@/components/Capsule";
import AccountsListElement from "../../components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import useBalances from "@/utility/balance/service/useBalances";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Left from "@/icons/Left";
import SwipeableElement from "@/components/SwipeableElement";
import Right from "@/icons/Right";
import SortableAccountElement from "@/components/SortableElement";
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
import { AccountType } from "@/utility/accounts/types";
import { getAll, putItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import AccountsListElementLoading from "@/components/Skeletons/AccountsListElementLoading";

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const { accountsStore } = DatabaseStores;
  const { getBalances } = useBalances();
  const router = useRouter();
  const [showHint, setShowHint] = useState(true);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const haveUserAccount = accounts.filter((item) => !item.default).length > 0;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);

    (async () => {
      try {
        const accs = await getAll<AccountType>(accountsStore);
        setAccounts(accs);
      } catch (error) {
        console.error("Failed to load accounts:", error);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => clearTimeout(timer);
  }, []);

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

    const visibleAccounts = accounts.filter((a) => !a.hidden);
    const hiddenAccounts = accounts.filter((a) => a.hidden);

    const oldIndex = visibleAccounts.findIndex((a) => a.id === active.id);
    const newIndex = visibleAccounts.findIndex((a) => a.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newVisibleAccounts = arrayMove(visibleAccounts, oldIndex, newIndex);

      const updatedVisibleAccounts = newVisibleAccounts.map((acc, index) => ({
        ...acc,
        order: index,
      }));

      const updatedHiddenAccounts = hiddenAccounts.map((acc) => ({
        ...acc,
        order: 999,
      }));

      const updatedAccounts = [
        ...updatedVisibleAccounts,
        ...updatedHiddenAccounts,
      ];

      updatedAccounts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setAccounts(updatedAccounts);

      for (const acc of updatedAccounts) {
        await putItem(accountsStore, acc);
      }
    }
  };

  if (!isLoading && accounts.length === 0) return null;

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
          className={`absolute top-16 z-20 right-1/2 translate-x-1/2 w-screen p-7.5 transition-all duration-700 ${showHint && !isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
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

        {isLoading ? (
          <div className="grid gap-5">
            <AccountsListElementLoading />
            <AccountsListElementLoading />
            <AccountsListElementLoading />
            <AccountsListElementLoading />
          </div>
        ) : (
          <div className="grid gap-5 animate-fade-in">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={accounts.filter((a) => !a.hidden).map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {accounts.map(
                  (account) =>
                    !account.hidden && (
                      <SortableAccountElement
                        key={account.id}
                        account={account}
                      >
                        <SwipeableElement
                          isOpen={openItemId === account.id}
                          onOpenChange={(open) =>
                            setOpenItemId(open ? account.id : null)
                          }
                          onCloseOthers={() => {
                            setOpenItemId(null);
                            setDragCounter((c) => c + 1);
                          }}
                          cancelConfirmSignal={dragCounter}
                          onEdit={() =>
                            router.push(`/accounts/edit?id=${account.id}`)
                          }
                          onDelete={() =>
                            router.push(`/accounts/delete?id=${account.id}`)
                          }
                          defaultAccount={account.default}
                        >
                          <AccountsListElement
                            account={account}
                            balances={getBalances()}
                            href={`accounts/${account.id}`}
                          />
                        </SwipeableElement>
                      </SortableAccountElement>
                    ),
                )}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
