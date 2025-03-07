"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";
import { IoChatbubbleEllipsesSharp, IoFilterOutline } from "react-icons/io5";
import { RiChatNewFill, RiContactsBook3Fill } from "react-icons/ri";
import { IoSend, IoTicket } from "react-icons/io5";
import { FaHome, FaBars, FaImages } from "react-icons/fa";
import { GoGraph } from "react-icons/go";
import { HiSpeakerphone } from "react-icons/hi";
import { GrConnect } from "react-icons/gr";
import { MdOutlineChecklist, MdDriveFolderUpload, MdDelete } from "react-icons/md";
import { IoIosSettings } from "react-icons/io";
import { ClipLoader } from "react-spinners";

type User = {
  id: string;
  name: string;
  mobile: string;
  user_metadata: { name?: string; mobile?: string };
} & import("@supabase/auth-js").User;

type Chat = {
  id: string;
  user1_id: string;
  user2_id: string;
  user2_name: string;
  user2_mobile: string;
  lastMessage?: string;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const router = useRouter();
  const selectedChat = chats.find((chat) => chat.id === selectedChatId) || null;
  const otherUserName = selectedChat?.user2_name || "Unknown User";
  const otherUserMobile = selectedChat?.user2_mobile || "Unknown Mobile";

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        setError("Error fetching users");
      } else {
        setUsers(data);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          router.push("/login");
        } else {
          setUser({
            ...data.user,
            name: data.user.user_metadata?.name || "Unknown",
            mobile: data.user.user_metadata?.mobile || "Unknown",
          });
        }
      } catch (err) {
        setError("Error fetching user");
        router.push("/login");
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      setLoadingChats(true);
      try {
        const { data: chatsData, error: chatsError } = await supabase
          .from("chats")
          .select("*")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (chatsError) {
          setError("Error fetching chats");
          return;
        }

        const userIds = chatsData
          .map((chat) =>
            chat.user1_id === user.id ? chat.user2_id : chat.user1_id
          )
          .filter(Boolean);

        if (userIds.length === 0) return;

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, mobile")
          .in("id", userIds);

        if (usersError) {
          setError("Error fetching names and mobile numbers");
          return;
        }

        const userMap = new Map(
          usersData.map((user) => [
            user.id,
            { name: user.name, mobile: user.mobile },
          ])
        );

        const chatsWithLastMessage = await Promise.all(
          chatsData.map(async (chat) => {
            const { data: messagesData, error: messagesError } = await supabase
              .from("messages")
              .select("*")
              .eq("chat_id", chat.id)
              .order("created_at", { ascending: false })
              .limit(1);

            if (messagesError) {
              setError("Error fetching last message");
              return {
                ...chat,
                user2_name:
                  userMap.get(
                    chat.user1_id === user.id ? chat.user2_id : chat.user1_id
                  )?.name || "Unknown",
                user2_mobile:
                  userMap.get(
                    chat.user1_id === user.id ? chat.user2_id : chat.user1_id
                  )?.mobile || "Unknown",
                lastMessage: null,
              };
            }

            return {
              ...chat,
              user2_name:
                userMap.get(
                  chat.user1_id === user.id ? chat.user2_id : chat.user1_id
                )?.name || "Unknown",
              user2_mobile:
                userMap.get(
                  chat.user1_id === user.id ? chat.user2_id : chat.user1_id
                )?.mobile || "Unknown",
              lastMessage: messagesData[0]?.content || "No messages yet",
            };
          })
        );

        setChats(chatsWithLastMessage);
      } catch (err) {
        setError("Error fetching chats");
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();
  }, [user]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId) return;
      setLoadingMessages(true);
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", selectedChatId)
          .order("created_at", { ascending: true });

        if (messagesError) {
          setError("Error fetching messages");
          return;
        }

        const userIds = messagesData.map((msg) => msg.sender_id).filter(Boolean);
        if (userIds.length === 0) return;

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        if (usersError) {
          setError("Error fetching names");
          return;
        }

        const userMap = new Map(usersData.map((user) => [user.id, user.name]));

        const messagesWithNames = messagesData.map((msg) => ({
          ...msg,
          sender_name: userMap.get(msg.sender_id) || "Unknown",
        }));

        setMessages(messagesWithNames);
      } catch (err) {
        setError("Error fetching messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;

    const subscription = supabase
      .channel(`messages:chat_id=eq.${selectedChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${selectedChatId}`,
        },
        async (payload) => {
          if (!payload.new.sender_id) return;
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name")
            .eq("id", payload.new.sender_id)
            .single();

          const sender_name = userError ? "Unknown" : userData.name;
          setMessages((prev) => [
            ...prev,
            { ...payload.new, sender_name } as Message,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChatId]);

  const sendMessage = async () => {
    if (!newMessage || !selectedChatId || !user) return;
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      if (userError) {
        setError("Error fetching sender name");
        return;
      }

      const sender_name = userData.name;
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: selectedChatId,
          sender_id: user.id,
          sender_name: sender_name,
          content: newMessage,
        })
        .select();

      if (error) {
        setError("Message send error");
      } else {
        setNewMessage("");
      }
    } catch (err) {
      setError("Error sending message");
    }
  };

  const handleUserSelect = async (user2_id: string) => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("chats")
        .insert([{ user1_id: user.id, user2_id }])
        .select();

      if (error) {
        setError("Error creating chat");
      } else {
        setChats((prev) => [...prev, data[0]]);
        setSelectedChatId(data[0].id);
        setIsUserListOpen(false);
      }
    } catch (err) {
      setError("Error creating chat");
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatId);

      if (error) {
        setError("Error deleting chat");
      } else {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      setError("Error deleting chat");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-1/25 bg-white p-4 border border-r-2 border-l-0 border-gray-300 text-gray-600" style={isUserListOpen ? { filter: 'blur(2px)' } : {}}>
        <FaHome className="w-6 h-6 mb-6 mt-10" />
        <IoChatbubbleEllipsesSharp className="w-6 h-6 mb-6 text-green-700" />
        <IoTicket className="w-6 h-6 mb-6" />
        <GoGraph className="w-6 h-6 mb-6" />
        <FaBars className="w-6 h-6 mb-6" />
        <HiSpeakerphone className="w-6 h-6 mb-6" />
        <GrConnect className="w-6 h-6 mb-6" />
        <RiContactsBook3Fill className="w-6 h-6 mb-6" />
        <FaImages className="w-6 h-6 mb-6" />
        <MdOutlineChecklist className="w-6 h-6 mb-6" />
        <IoIosSettings className="w-6 h-6 mb-6" />
      </div>
      <div className="w-7/25 text-black bg-white relative" style={isUserListOpen ? { filter: 'blur(2px)' } : {}}>
        <div className="text-gray-500 flex gap-2 p-4 border border-b-1 border-gray-300 items-center relative">
          <IoChatbubbleEllipsesSharp />
          <h2 className="text-l font-bold mb-4 absolute top-3 left-10">
            chats
          </h2>
        </div>
        <div className="text-green-700 flex items-center p-4 bg-gray-100 relative">
          <MdDriveFolderUpload className="w-5 h-5 text-green-700" />
          <span className="ml-2">Custom filter</span>
          <button className="ml-2 bg-white hover:bg-white text-black border border-gray-400 font-bold py-1 px-4 rounded text-sm">
            Save
          </button>
          <div className="right-2 absolute flex items-center bg-white p-2 rounded text-green-700">
            <IoFilterOutline className="text-green-700" />
            <span className="text-green-700 pl-2">Filtered</span>
          </div>
        </div>
        <button
          onClick={() => setIsUserListOpen(true)}
          className="p-2 bg-[#0C8E4D] text-white rounded-full hover:bg-[#0c8e4dd6] mb-4 absolute right-0 bottom-0 mx-4 my-10"
        >
          <RiChatNewFill className="w-6 h-6" />
        </button>
        {loadingChats ? (
          <div className="flex justify-center items-center h-full">
            <ClipLoader color="#0C8E4D" size={50} />
          </div>
        ) : (
          <ul className="w-full">
            {chats.map((chat) => (
              <li
                key={chat.id}
                className={`cursor-pointer p-4 py-6 rounded hover:bg-gray-100 flex items-center ${
                  selectedChatId === chat.id ? "bg-gray-100" : ""
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <img src="user.png" className="h-10 w-10 mr-5" alt="" />
                <span className="ml-2">{chat.user2_name || "Unknown User"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={`w-17/25 h-screen flex flex-col relative ${isUserListOpen ? 'blur-sm' : ''}`}
        style={{
          backgroundImage: "url(bg.jpg)",
          backgroundRepeat: "repeat",
        }}
      >
        {selectedChatId ? (
          <div className="flex-1 flex flex-col overflow-y-scroll">
            <div className="bg-white w-full h-18 flex flex-row justify-between p-4 sticky top-0 z-10">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-black">{otherUserName}</h2>
                <p className="text-gray-600">+91 {otherUserMobile}</p>
              </div>
              <div>
                <button
                  onClick={() => deleteChat(selectedChatId)}
                  className="p-2  rounded w-6 h-6 text-red-700"
                >
                  <MdDelete className="w-6 h-6 cursor-pointer hover:text-red-500"/>
                </button>
              </div>
            </div>
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <ClipLoader color="#0C8E4D" size={50} />
              </div>
            ) : (
              <div className="flex-1 p-2 mb-4 space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === user?.id ? "justify-end" : "justify-start"
                    } space-x-2`}
                  >
                    <div
                      className={`p-2 rounded text-black ${
                        msg.sender_id === user?.id ? "bg-[#E7FEDC]" : "bg-white"
                      }`}
                      style={{ maxWidth: "400px", width: "fit-content" }}
                    >
                      <div className="text-sm font-semibold mb-1">
                        {msg.sender_name || "Unknown User"}
                      </div>
                      <div className="overflow-scroll">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2 sticky bottom-0">
              <input
                type="text"
                value={newMessage}
                placeholder="Message..."
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-4 bg-white text-black w-screen"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-white text-[#0C8E4D] rounded absolute right-2 top-2"
              >
                <IoSend className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center mt-4 text-black">
            Select a chat to start messaging
          </p>
        )}
      </div>

      {isUserListOpen && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Contacts</h2>
            <ul className="space-y-2">
              {users
                .filter((u) => u.id !== user?.id)
                .map((user) => (
                  <li
                    key={user.id}
                    className="p-2 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserSelect(user.id)}
                  >
                    {user.name || user.email || "Unknown User"}
                  </li>
                ))}
            </ul>
            <button
              onClick={() => setIsUserListOpen(false)}
              className="mt-4 p-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}