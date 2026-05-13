import { MailPlus, Trash2 } from "lucide-react";
import { createHouseholdInvite, removeHouseholdInvite } from "@/app/actions/budget-actions";
import { AppNav } from "@/components/nav";
import { requireHousehold } from "@/lib/household";
import { prisma } from "@/lib/prisma";

export default async function HouseholdPage() {
  const { household, membership, user } = await requireHousehold();
  const isOwner = membership.role === "OWNER";
  const [members, invites] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId: household.id },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.householdInvite.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>{household.name}</h1>
            <p>Manage the people who can access this shared household budget.</p>
          </div>
        </div>

        <section className="grid">
          <div className="panel span6">
            <h2>Members</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.user.name ?? "Member"}</td>
                    <td>{member.user.email}</td>
                    <td>
                      <span className="pill">{member.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel span6">
            <h2>Invite access</h2>
            {isOwner ? (
              <form action={createHouseholdInvite} className="formGrid compactForm">
                <div className="field full">
                  <label htmlFor="email">Google account email</label>
                  <input id="email" name="email" type="email" placeholder="name@example.com" required />
                </div>
                <div className="field">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" defaultValue="MEMBER">
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div className="field formAction">
                  <button className="button primary" type="submit">
                    <MailPlus size={17} />
                    Add invite
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted">Only household owners can invite new members.</p>
            )}

            <div className="sectionBreak">
              <h3>Invites</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    {isOwner && <th />}
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id}>
                      <td>{invite.email}</td>
                      <td>{invite.acceptedAt ? "Accepted" : "Pending"}</td>
                      <td>{invite.role}</td>
                      {isOwner && (
                        <td className="amount">
                          {!invite.acceptedAt && (
                            <form action={removeHouseholdInvite}>
                              <input name="inviteId" type="hidden" value={invite.id} />
                              <button className="button iconOnly" aria-label={`Remove invite for ${invite.email}`} type="submit">
                                <Trash2 size={16} />
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td className="muted" colSpan={isOwner ? 4 : 3}>
                        No invitations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
