import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "../../../components";
import { Description } from "../../../components/Description/Description";
import { Input } from "../../../components/Form";

import { modal } from "../../../components/Modal/Modal";
import { Space } from "../../../components/Space/Space";
import { useAPI } from "../../../providers/ApiProvider";
import { useConfig } from "../../../providers/ConfigProvider";
import { useCurrentUser } from "../../../providers/CurrentUser";
import { useUserRoles } from "../../../hooks/useUserRoles";
import { Block, Elem } from "../../../utils/bem";
import { FF_AUTH_TOKENS, FF_LSDV_E_297, isFF } from "../../../utils/feature-flags";
import "./PeopleInvitation.scss";
import { PeopleList } from "./PeopleList";
import "./PeoplePage.scss";
// SelectedUser import removed - no longer needed
import { TokenSettingsModal } from "@humansignal/app-common/blocks/TokenSettingsModal";
import { IconPlus } from "@humansignal/icons";
import { useToast } from "@humansignal/ui";
import { InviteLink } from "./InviteLink";
import { debounce } from "@humansignal/core/lib/utils/debounce";

const InvitationModal = ({ link }) => {
  return (
    <Block name="invite">
      <Input
        value={link}
        style={{ width: "100%" }}
        readOnly
        onCopy={debounce(() => __lsa("organization.add_people.manual_copy_link"), 1000)}
        onSelect={debounce(() => __lsa("organization.add_people.select_link"), 1000)}
      />

      <Description style={{ marginTop: 16 }}>
        Invite people to join your Label Studio instance. People that you invite have full access to all of your
        projects.{" "}
        <a
          href="https://labelstud.io/guide/signup.html"
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            __lsa("docs.organization.add_people.learn_more", { href: "https://labelstud.io/guide/signup.html" })
          }
        >
          Learn more
        </a>
        .
      </Description>
    </Block>
  );
};

export const PeoplePage = () => {
  const api = useAPI();
  const inviteModal = useRef();
  const apiSettingsModal = useRef();
  const config = useConfig();
  const toast = useToast();
  const { user } = useCurrentUser();
  const { hasRole } = useUserRoles();
  // selectedUser state removed - no longer needed
  const [invitationOpen, setInvitationOpen] = useState(false);

  const [link, setLink] = useState();

  // Determine user role
  const isAdmin = hasRole('admin') || user?.email === 'dhaneshwari.tosscss@gmail.com';
  const isClient = hasRole('client') || user?.email === 'dhaneshwari.ttosscss@gmail.com';
  const isUser = hasRole('user');
  
  // Access control: Only admins and clients can access this page, not regular users
  const shouldBlockAccess = isUser || (!isAdmin && !isClient);

  // selectUser function removed - no longer needed

  const apiTokensSettingsModalProps = useMemo(
    () => ({
      title: "API Token Settings",
      style: { width: 480 },
      body: () => (
        <TokenSettingsModal
          onSaved={() => {
            toast.show({ message: "API Token settings saved" });
            apiSettingsModal.current?.close();
          }}
        />
      ),
    }),
    [],
  );

  const showApiTokenSettingsModal = useCallback(() => {
    apiSettingsModal.current = modal(apiTokensSettingsModalProps);
    __lsa("organization.token_settings");
  }, [apiTokensSettingsModalProps]);

  // defaultSelected removed - no longer needed

  // Conditional rendering after all hooks are called
  if (shouldBlockAccess) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "20px"
      }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          maxWidth: "500px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "20px"
          }}>
            🚫
          </div>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1f2937",
            marginBottom: "12px"
          }}>
            Access Denied
          </h1>
          <p style={{
            fontSize: "16px",
            color: "#6b7280",
            marginBottom: "24px",
            lineHeight: "1.5"
          }}>
            You don't have permission to access the Organization page. 
            Only administrators and clients can manage organization settings and people.
          </p>
          <button
            onClick={() => window.location.href = '/projects'}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <Block name="people">
      <Elem name="controls">
        <Space spread>
          <Space />

          <Space>
            {isFF(FF_AUTH_TOKENS) && <Button onClick={showApiTokenSettingsModal} className="white-text-button" style={{
              background: "linear-gradient(135deg, rgb(102, 126, 234), rgb(118, 75, 162)) !important",
              color: "white !important",
              border: "none"
            }}>API Tokens Settings</Button>}
            <Button icon={<IconPlus />} primary onClick={() => setInvitationOpen(true)} className="white-text-button" style={{
              background: "linear-gradient(135deg, rgb(102, 126, 234), rgb(118, 75, 162)) !important",
              color: "white !important",
              border: "none"
            }}>
              Add People
            </Button>
          </Space>
        </Space>
      </Elem>
      <Elem name="content">
        <PeopleList />

        {/* SelectedUser component removed - no longer needed */}
      </Elem>
      <InviteLink
        opened={invitationOpen}
        onClosed={() => {
          console.log("hidden");
          setInvitationOpen(false);
        }}
      />
    </Block>
  );
};

PeoplePage.title = "People";
PeoplePage.path = "/";
